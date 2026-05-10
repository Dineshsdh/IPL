import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE } from '../utils/api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [activePoolId, setActivePoolId] = useState(null);
  const [auctionState, setAuctionState] = useState({
    isActive: false,
    isPaused: false,
    mode: 'single',
    currentPlayer: null,
    currentBid: 0,
    currentBidder: null,
    currentBidderName: '',
    timer: 30,
    bids: [],
    queueLength: 0,
    queueIndex: 0,
    minIncrement: 0.05,
    quickIncrements: [0.05, 0.10, 0.25, 0.50]
  });
  const [soldInfo, setSoldInfo] = useState(null);
  const [unsoldInfo, setUnsoldInfo] = useState(null);

  useEffect(() => {
    const newSocket = io(API_BASE, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
    });

    newSocket.on('auction-state', (data) => {
      setAuctionState(data);
      setSoldInfo(null);
      setUnsoldInfo(null);
    });

    newSocket.on('bid-update', (data) => {
      setAuctionState(prev => ({
        ...prev,
        currentBid: data.currentBid,
        currentBidder: data.currentBidder,
        currentBidderName: data.currentBidderName,
        timer: data.timer,
        bids: data.bids,
        minIncrement: data.minIncrement,
        quickIncrements: data.quickIncrements
      }));
    });

    newSocket.on('timer-tick', (data) => {
      setAuctionState(prev => ({ ...prev, timer: data.timer }));
    });

    newSocket.on('player-sold', (data) => {
      setSoldInfo(data);
      setAuctionState(prev => ({ ...prev, isActive: false }));
    });

    newSocket.on('player-unsold', (data) => {
      setUnsoldInfo(data);
      setAuctionState(prev => ({ ...prev, isActive: false }));
    });

    newSocket.on('auction-paused', () => {
      setAuctionState(prev => ({ ...prev, isPaused: true }));
    });

    newSocket.on('auction-resumed', () => {
      setAuctionState(prev => ({ ...prev, isPaused: false }));
    });

    newSocket.on('auction-ended', () => {
      setAuctionState({
        isActive: false,
        isPaused: false,
        mode: 'single',
        currentPlayer: null,
        currentBid: 0,
        currentBidder: null,
        currentBidderName: '',
        timer: 30,
        bids: [],
        queueLength: 0,
        queueIndex: 0,
        minIncrement: 0.05,
        quickIncrements: [0.05, 0.10, 0.25, 0.50]
      });
    });

    newSocket.on('auction-error', (data) => {
      alert(`Auction Error: ${data.message}`);
    });

    newSocket.on('bid-error', (data) => {
      console.error(`Bid Error: ${data.message}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinPool = (poolId) => {
    if (socket && poolId) {
      if (activePoolId) {
        socket.emit('leave-pool', { poolId: activePoolId });
      }
      setActivePoolId(poolId);
      socket.emit('join-pool', { poolId });
    }
  };

  const leavePool = () => {
    if (socket && activePoolId) {
      socket.emit('leave-pool', { poolId: activePoolId });
      setActivePoolId(null);
    }
  };

  const placeBid = (teamId, teamName, amount) => {
    if (socket && activePoolId) {
      socket.emit('place-bid', { poolId: activePoolId, teamId, teamName, amount });
    }
  };

  const startPlayerAuction = (playerId, mode = 'single') => {
    if (socket && activePoolId) {
      socket.emit('start-player-auction', { poolId: activePoolId, playerId, mode });
    }
  };

  const startMultiAuction = (playerIds) => {
    if (socket && activePoolId) {
      socket.emit('start-multi-auction', { poolId: activePoolId, playerIds });
    }
  };

  const skipPlayer = () => {
    if (socket && activePoolId) {
      socket.emit('skip-player', { poolId: activePoolId });
    }
  };

  const endAuction = () => {
    if (socket && activePoolId) {
      socket.emit('end-auction', { poolId: activePoolId });
    }
  };

  const pauseAuction = () => {
    if (socket && activePoolId) {
      socket.emit('pause-auction', { poolId: activePoolId });
    }
  };

  const resumeAuction = () => {
    if (socket && activePoolId) {
      socket.emit('resume-auction', { poolId: activePoolId });
    }
  };

  const clearSold = () => setSoldInfo(null);
  const clearUnsold = () => setUnsoldInfo(null);

  return (
    <SocketContext.Provider value={{
      socket, connected, auctionState, soldInfo, unsoldInfo,
      activePoolId, joinPool, leavePool,
      placeBid, startPlayerAuction, startMultiAuction, skipPlayer, endAuction,
      pauseAuction, resumeAuction,
      clearSold, clearUnsold
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
}

export default SocketContext;
