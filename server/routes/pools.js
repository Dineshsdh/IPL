const express = require('express');
const VirtualPool = require('../models/VirtualPool');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Generate random 6-character code
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// POST /api/pools - Create a new pool
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, mode } = req.body;
    
    // Create new pool
    const pool = new VirtualPool({
      name: name || 'My Auction Pool',
      joinCode: generateCode(),
      creator: req.user._id,
      mode: mode || 'multi',
      playerStates: [],
      teams: []
    });

    // Populate playerStates with all global players defaulting to unsold
    const allPlayers = await Player.find({}, '_id');
    pool.playerStates = allPlayers.map(p => ({
      player: p._id,
      status: 'unsold',
      soldTo: null,
      soldToName: '',
      finalPrice: 0
    }));

    await pool.save();
    
    res.status(201).json(pool);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/pools/join - Join a pool
router.post('/join', authenticate, async (req, res) => {
  try {
    const { joinCode, teamName } = req.body;
    
    const pool = await VirtualPool.findOne({ joinCode: joinCode.toUpperCase() });
    if (!pool) return res.status(404).json({ message: 'Pool not found' });

    // Check if user already has a team in this pool
    const existingTeam = await Team.findOne({ owner: req.user._id, poolId: pool._id });
    if (existingTeam) {
      return res.json({ message: 'Already joined', team: existingTeam, poolId: pool._id });
    }

    // Create a new team for this pool
    const team = new Team({
      name: teamName || `${req.user.name}'s Team`,
      owner: req.user._id,
      poolId: pool._id,
      budget: 120,
      maxBudget: 120,
      inPool: true // Automatically in bidding pool
    });
    
    await team.save();
    
    pool.teams.push(team._id);
    await pool.save();

    res.json({ message: 'Joined pool successfully', team, poolId: pool._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/pools/my - Get pools user is part of
router.get('/my', authenticate, async (req, res) => {
  try {
    // Pools created by user
    const createdPools = await VirtualPool.find({ creator: req.user._id }).populate('teams', 'name');
    
    // Pools user joined (has a team in)
    const userTeams = await Team.find({ owner: req.user._id, poolId: { $ne: null } });
    const joinedPoolIds = userTeams.map(t => t.poolId);
    
    const joinedPools = await VirtualPool.find({ _id: { $in: joinedPoolIds }, creator: { $ne: req.user._id } }).populate('teams', 'name');

    res.json({ created: createdPools, joined: joinedPools });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/pools/:id - Get specific pool details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const pool = await VirtualPool.findById(req.params.id)
      .populate('creator', 'name')
      .populate('teams')
      .populate('playerStates.player');
      
    if (!pool) return res.status(404).json({ message: 'Pool not found' });
    res.json(pool);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
