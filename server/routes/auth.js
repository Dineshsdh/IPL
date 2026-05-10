const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Team = require('../models/Team');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Register a new team or viewer
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, teamName, role: requestedRole } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const isViewer = requestedRole === 'viewer';

    // If registering as team, validate team name
    if (!isViewer) {
      if (!teamName) {
        return res.status(400).json({ message: 'Team name is required' });
      }
      const existingTeam = await Team.findOne({ name: teamName });
      if (existingTeam) {
        return res.status(400).json({ message: 'Team name already taken' });
      }
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role: isViewer ? 'viewer' : 'team',
      teamName: isViewer ? undefined : teamName
    });
    await user.save();

    // Create team only for team role
    let teamId = null;
    if (!isViewer) {
      const team = new Team({ name: teamName, owner: user._id, budget: 120, maxBudget: 120 });
      await team.save();
      teamId = team._id;
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamName: user.teamName,
        teamId
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Get team info if team role
    let teamId = null;
    let teamName = user.teamName;
    if (user.role === 'team') {
      const team = await Team.findOne({ owner: user._id });
      if (team) teamId = team._id;
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamName,
        teamId
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    let teamId = null;
    if (req.user.role === 'team') {
      const team = await Team.findOne({ owner: req.user._id });
      if (team) teamId = team._id;
    }

    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      teamName: req.user.teamName,
      teamId
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
