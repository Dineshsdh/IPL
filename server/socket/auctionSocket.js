const Player = require('../models/Player');
const Team = require('../models/Team');
const Bid = require('../models/Bid');
const AutoBid = require('../models/AutoBid');
const VirtualPool = require('../models/VirtualPool');

// Map to store state for each pool: poolId -> state object
const poolStates = new Map();

function getInitialState(poolId) {
  return {
    poolId,
    isActive: false,
    isPaused: false,
    mode: 'multi',
    currentPlayer: null,
    currentBid: 0,
    currentBidder: null,
    currentBidderName: '',
    timer: 30,
    bids: [],
    timerInterval: null,
    queue: [],
    queueIndex: 0,
    autoAdvance: false
  };
}

function getPoolState(poolId) {
  if (!poolStates.has(poolId)) {
    poolStates.set(poolId, getInitialState(poolId));
  }
  return poolStates.get(poolId);
}

// Dynamic bid increment
function getMinIncrement(currentBid) {
  if (currentBid < 1) return 0.05;
  if (currentBid < 2) return 0.10;
  if (currentBid < 5) return 0.20;
  if (currentBid < 10) return 0.25;
  if (currentBid < 20) return 0.50;
  return 1;
}

function getQuickIncrements(currentBid) {
  const min = getMinIncrement(currentBid);
  return [min, min * 2, min * 5, min * 10];
}

function initAuctionSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join pool room
    socket.on('join-pool', (data) => {
      const { poolId } = data;
      if (poolId) {
        socket.join(poolId);
        console.log(`Socket ${socket.id} joined pool ${poolId}`);
        socket.emit('auction-state', getPublicState(poolId));
      }
    });

    socket.on('leave-pool', (data) => {
      const { poolId } = data;
      if (poolId) {
        socket.leave(poolId);
        console.log(`Socket ${socket.id} left pool ${poolId}`);
      }
    });

    // ─── SINGLE PLAYER MODE ───
    socket.on('start-player-auction', async (data) => {
      const { poolId, playerId, mode } = data;
      if (!poolId) return;

      try {
        const pool = await VirtualPool.findById(poolId);
        if (!pool) return socket.emit('auction-error', { message: 'Pool not found' });

        // Reset previous in-auction players in this pool
        pool.playerStates.forEach(ps => {
          if (ps.status === 'in-auction') ps.status = 'unsold';
        });
        
        const playerState = pool.playerStates.find(ps => ps.player.toString() === playerId);
        if (!playerState) {
          return socket.emit('auction-error', { message: 'Player not found in pool' });
        }
        playerState.status = 'in-auction';
        await pool.save();

        const fullPlayer = await Player.findById(playerId);

        const state = getPoolState(poolId);
        clearTimer(state);

        state.isActive = true;
        state.isPaused = false;
        state.mode = mode || 'single';
        state.currentPlayer = fullPlayer;
        state.currentBid = fullPlayer.basePrice;
        state.currentBidder = null;
        state.currentBidderName = '';
        state.timer = 30;
        state.bids = [];
        
        io.to(poolId).emit('auction-state', getPublicState(poolId));
        startTimer(io, poolId);
        
        setTimeout(() => checkAutoBids(io, poolId), 1000);
      } catch (err) {
        console.error('Start auction error:', err);
        socket.emit('auction-error', { message: 'Failed to start auction' });
      }
    });

    // ─── MULTI PLAYER MODE ───
    socket.on('start-multi-auction', async (data) => {
      const { poolId, playerIds } = data;
      if (!poolId || !playerIds || playerIds.length === 0) return;

      try {
        const pool = await VirtualPool.findById(poolId);
        pool.playerStates.forEach(ps => {
          if (ps.status === 'in-auction') ps.status = 'unsold';
        });
        await pool.save();

        const players = await Player.find({ _id: { $in: playerIds } });
        if (players.length === 0) return socket.emit('auction-error', { message: 'No valid players found' });

        const state = getPoolState(poolId);
        clearTimer(state);

        state.mode = 'multi';
        state.queue = players;
        state.queueIndex = 0;
        state.autoAdvance = true;
        state.isPaused = false;

        await startNextInQueue(io, poolId);

      } catch (err) {
        console.error('Start multi auction error:', err);
        socket.emit('auction-error', { message: 'Failed to start multi-auction' });
      }
    });

    // ─── PAUSE / RESUME ───
    socket.on('pause-auction', (data) => {
      const { poolId } = data;
      if (!poolId) return;
      const state = getPoolState(poolId);
      if (!state.isActive || state.isPaused) return;

      state.isPaused = true;
      clearTimer(state);
      io.to(poolId).emit('auction-paused', { timer: state.timer });
      io.to(poolId).emit('auction-state', getPublicState(poolId));
    });

    socket.on('resume-auction', (data) => {
      const { poolId } = data;
      if (!poolId) return;
      const state = getPoolState(poolId);
      if (!state.isActive || !state.isPaused) return;

      state.isPaused = false;
      io.to(poolId).emit('auction-resumed', { timer: state.timer });
      io.to(poolId).emit('auction-state', getPublicState(poolId));
      startTimer(io, poolId);
    });

    // Team places a bid
    socket.on('place-bid', async (data) => {
      const { poolId, teamId, teamName, amount } = data;
      if (!poolId) return;
      const state = getPoolState(poolId);

      try {
        if (!state.isActive) return socket.emit('bid-error', { message: 'No active auction' });
        if (state.isPaused) return socket.emit('bid-error', { message: 'Auction is paused' });

        const minIncrement = getMinIncrement(state.currentBid);
        const minBid = state.currentBidder ? state.currentBid + minIncrement : state.currentBid;

        if (amount < minBid) {
          return socket.emit('bid-error', { message: \`Bid must be at least ₹\${minBid.toFixed(2)} Cr\` });
        }

        const team = await Team.findOne({ _id: teamId, poolId: poolId });
        if (!team) return socket.emit('bid-error', { message: 'Team not found in this pool' });

        if (amount > team.budget) return socket.emit('bid-error', { message: \`Insufficient budget\` });
        if (team.players && team.players.length >= team.maxPlayers) return socket.emit('bid-error', { message: \`Squad full\` });

        state.currentBid = amount;
        state.currentBidder = teamId;
        state.currentBidderName = teamName;
        state.timer = 30;

        const bidEntry = { teamId, teamName, amount, timestamp: new Date() };
        state.bids.push(bidEntry);

        // Add to team bid history
        team.bidHistory.push({
          player: state.currentPlayer._id,
          playerName: state.currentPlayer.name,
          amount,
          won: false
        });
        await team.save();

        io.to(poolId).emit('bid-update', {
          currentBid: amount,
          currentBidder: teamId,
          currentBidderName: teamName,
          timer: 30,
          newBid: bidEntry,
          bids: state.bids,
          minIncrement: getMinIncrement(amount),
          quickIncrements: getQuickIncrements(amount)
        });
        
        setTimeout(() => checkAutoBids(io, poolId), 1000);

      } catch (err) {
        console.error('Place bid error:', err);
        socket.emit('bid-error', { message: 'Failed to place bid' });
      }
    });

    socket.on('skip-player', async (data) => {
      const { poolId } = data;
      if (!poolId) return;
      const state = getPoolState(poolId);
      clearTimer(state);

      if (state.currentPlayer) {
        const pool = await VirtualPool.findById(poolId);
        const pState = pool.playerStates.find(ps => ps.player.toString() === state.currentPlayer._id.toString());
        if (pState) pState.status = 'unsold';
        await pool.save();
        io.to(poolId).emit('player-unsold', { player: state.currentPlayer });
      }

      if (state.mode === 'multi' && state.autoAdvance) {
        state.queueIndex++;
        setTimeout(() => startNextInQueue(io, poolId), 3000);
      } else {
        resetCurrentPlayer(state);
        io.to(poolId).emit('auction-state', getPublicState(poolId));
      }
    });

    socket.on('end-auction', async (data) => {
      const { poolId } = data;
      if (!poolId) return;
      const state = getPoolState(poolId);
      clearTimer(state);
      
      const pool = await VirtualPool.findById(poolId);
      if (pool) {
        pool.playerStates.forEach(ps => { if (ps.status === 'in-auction') ps.status = 'unsold'; });
        await pool.save();
      }

      Object.assign(state, getInitialState(poolId));

      io.to(poolId).emit('auction-ended', { message: 'Auction has ended' });
      io.to(poolId).emit('auction-state', getPublicState(poolId));
    });

    socket.on('disconnect', () => {
      console.log(\`Client disconnected: \${socket.id}\`);
    });
  });

  // ─── Helper Functions ───

  function clearTimer(state) {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function resetCurrentPlayer(state) {
    state.isActive = false;
    state.isPaused = false;
    state.currentPlayer = null;
    state.timer = 30;
    state.bids = [];
    state.currentBid = 0;
    state.currentBidder = null;
    state.currentBidderName = '';
  }

  function getPublicState(poolId) {
      const state = getPoolState(poolId);
      const minIncrement = state.currentBid ? getMinIncrement(state.currentBid) : 0.05;

      return {
        isActive: state.isActive,
        isPaused: state.isPaused,
        mode: state.mode,
        currentPlayer: state.currentPlayer,
        currentBid: state.currentBid,
        currentBidder: state.currentBidder,
        currentBidderName: state.currentBidderName,
        timer: state.timer,
        bids: state.bids || [],
        queueLength: state.queue ? state.queue.length : 0,
        queueIndex: state.queueIndex || 0,
        minIncrement,
        quickIncrements: getQuickIncrements(state.currentBid || 0.5)
      };
  }

  async function startNextInQueue(ioRef, poolId) {
    const state = getPoolState(poolId);
    if (state.queueIndex >= state.queue.length) {
      state.autoAdvance = false;
      resetCurrentPlayer(state);
      state.mode = 'single';
      state.queue = [];
      state.queueIndex = 0;
      ioRef.to(poolId).emit('auction-ended', { message: 'All players in queue have been auctioned!' });
      ioRef.to(poolId).emit('auction-state', getPublicState(poolId));
      return;
    }

    const player = state.queue[state.queueIndex];
    const pool = await VirtualPool.findById(poolId);
    const pState = pool.playerStates.find(ps => ps.player.toString() === player._id.toString());
    
    if (!pState || pState.status === 'sold') {
      state.queueIndex++;
      return startNextInQueue(ioRef, poolId);
    }

    pState.status = 'in-auction';
    await pool.save();

    const dbPlayer = await Player.findById(player._id);
    clearTimer(state);

    state.isActive = true;
    state.isPaused = false;
    state.currentPlayer = dbPlayer;
    state.currentBid = dbPlayer.basePrice;
    state.currentBidder = null;
    state.currentBidderName = '';
    state.timer = 30;
    state.bids = [];

    ioRef.to(poolId).emit('auction-state', getPublicState(poolId));
    startTimer(ioRef, poolId);
    
    setTimeout(() => checkAutoBids(ioRef, poolId), 1000);
  }

  function startTimer(ioRef, poolId) {
    const state = getPoolState(poolId);
    state.timerInterval = setInterval(async () => {
      state.timer--;
      ioRef.to(poolId).emit('timer-tick', { timer: state.timer });

      if (state.timer <= 0) {
        clearTimer(state);

        const pool = await VirtualPool.findById(poolId);
        const pState = pool.playerStates.find(ps => ps.player.toString() === state.currentPlayer._id.toString());

        if (state.currentBidder) {
          // SOLD
          if (pState) {
            pState.status = 'sold';
            pState.soldTo = state.currentBidder;
            pState.soldToName = state.currentBidderName;
            pState.finalPrice = state.currentBid;
            await pool.save();
          }

          const team = await Team.findById(state.currentBidder);
          if (team) {
            team.budget = parseFloat((team.budget - state.currentBid).toFixed(2));
            team.players.push({ player: state.currentPlayer._id, boughtAt: state.currentBid });
            team.bidHistory.push({
              player: state.currentPlayer._id,
              playerName: state.currentPlayer.name,
              amount: state.currentBid,
              won: true
            });
            await team.save();
          }

          ioRef.to(poolId).emit('player-sold', {
            player: state.currentPlayer,
            soldTo: state.currentBidderName,
            soldToId: state.currentBidder,
            finalPrice: state.currentBid
          });
        } else {
          // UNSOLD
          if (pState) {
            pState.status = 'unsold';
            await pool.save();
          }
          ioRef.to(poolId).emit('player-unsold', { player: state.currentPlayer });
        }

        if (state.mode === 'multi' && state.autoAdvance) {
          state.queueIndex++;
          setTimeout(() => startNextInQueue(ioRef, poolId), 4000);
        } else {
          state.isActive = false;
          state.currentPlayer = null;
        }
      }
    }, 1000);
  }

  async function checkAutoBids(ioRef, poolId) {
    const state = getPoolState(poolId);
    if (!state.isActive || state.isPaused || !state.currentPlayer) return;
    
    // Auto-bid logic can be updated to be pool-specific later if necessary
    // For now, auto-bids are global, but we must check if the autobid team is in the pool
    try {
      const minIncrement = getMinIncrement(state.currentBid);
      const requiredBid = state.currentBidder ? state.currentBid + minIncrement : state.currentBid;
      
      const autoBids = await AutoBid.find({
        player: state.currentPlayer._id,
        active: true,
        maxAmount: { $gte: requiredBid }
      }).populate('team');
      
      const eligibleBids = autoBids.filter(ab => {
        if (!ab.team || ab.team.poolId?.toString() !== poolId) return false;
        if (state.currentBidder && ab.team._id.toString() === state.currentBidder.toString()) return false;
        if (ab.team.budget < requiredBid) return false;
        if (ab.team.players && ab.team.players.length >= (ab.team.maxPlayers || 25)) return false;
        return true;
      });
      
      if (eligibleBids.length === 0) return;
      
      eligibleBids.sort((a, b) => b.maxAmount - a.maxAmount);
      const bestAutoBid = eligibleBids[0];
      
      const teamId = bestAutoBid.team._id.toString();
      const teamName = bestAutoBid.team.name;
      const amount = parseFloat(requiredBid.toFixed(2));
      
      state.currentBid = amount;
      state.currentBidder = teamId;
      state.currentBidderName = teamName;
      state.timer = 30;
      
      const bidEntry = { teamId, teamName, amount, timestamp: new Date(), isAutoBid: true };
      state.bids.push(bidEntry);
      
      bestAutoBid.team.bidHistory.push({
        player: state.currentPlayer._id,
        playerName: state.currentPlayer.name,
        amount,
        won: false
      });
      await bestAutoBid.team.save();
      
      ioRef.to(poolId).emit('bid-update', {
        currentBid: amount,
        currentBidder: teamId,
        currentBidderName: teamName,
        timer: 30,
        newBid: bidEntry,
        bids: state.bids,
        minIncrement: getMinIncrement(amount),
        quickIncrements: getQuickIncrements(amount)
      });
      
      setTimeout(() => checkAutoBids(ioRef, poolId), 1000);
      
    } catch (err) {
      console.error('Auto bid error:', err);
    }
  }
}

module.exports = initAuctionSocket;

