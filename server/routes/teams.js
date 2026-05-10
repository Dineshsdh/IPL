const express = require('express');
const Team = require('../models/Team');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all teams with budgets
router.get('/', authenticate, async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('owner', 'name email')
      .populate('players.player', 'name role finalPrice');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single team detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('players.player', 'name role basePrice finalPrice image')
      .populate('bidHistory.player', 'name role');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get team by owner (for current user's team)
router.get('/my/team', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({ owner: req.user._id })
      .populate('players.player', 'name role basePrice finalPrice image')
      .populate('bidHistory.player', 'name role');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── Pool Management ───

// GET /api/teams/pool/list — Get teams in the bidding pool
router.get('/pool/list', authenticate, async (req, res) => {
  try {
    const poolTeams = await Team.find({ inPool: true })
      .populate('owner', 'name email');
    res.json(poolTeams);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/teams/pool/join — Team joins bidding pool
router.post('/pool/join', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({ owner: req.user._id });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    team.inPool = true;
    await team.save();
    res.json({ message: `${team.name} joined the bidding pool`, team });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/teams/pool/leave — Team leaves bidding pool
router.post('/pool/leave', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({ owner: req.user._id });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    team.inPool = false;
    await team.save();
    res.json({ message: `${team.name} left the bidding pool`, team });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/teams/pool/toggle/:id — Admin toggles a team in/out of pool
router.put('/pool/toggle/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    team.inPool = !team.inPool;
    await team.save();
    res.json({ message: `${team.name} is now ${team.inPool ? 'in' : 'out of'} the pool`, team });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/teams/pool/add-all — Admin adds all teams to pool
router.post('/pool/add-all', authenticate, requireAdmin, async (req, res) => {
  try {
    await Team.updateMany({}, { inPool: true });
    res.json({ message: 'All teams added to bidding pool' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/teams/pool/clear — Admin removes all teams from pool
router.post('/pool/clear', authenticate, requireAdmin, async (req, res) => {
  try {
    await Team.updateMany({}, { inPool: false });
    res.json({ message: 'Pool cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/teams/:id/budget — Admin sets budget for a team
router.put('/:id/budget', authenticate, requireAdmin, async (req, res) => {
  try {
    const { budget } = req.body;
    const team = await Team.findByIdAndUpdate(req.params.id, { budget, maxBudget: budget }, { new: true });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
