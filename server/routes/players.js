const express = require('express');
const Player = require('../models/Player');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all players (with optional filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, role, status, season, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (season) filter.season = season;
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const players = await Player.find(filter)
      .populate('soldTo', 'name')
      .sort({ createdAt: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add a player (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, role, basePrice, image, category, country } = req.body;
    const player = new Player({ name, role, basePrice, image, category, country });
    await player.save();
    res.status(201).json(player);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Bulk add players (admin only)
router.post('/bulk', authenticate, requireAdmin, async (req, res) => {
  try {
    const { players } = req.body;
    const created = await Player.insertMany(players);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update a player (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!player) return res.status(404).json({ message: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Patch specific fields (admin only)
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const allowed = ['category', 'basePrice', 'image', 'role', 'name', 'country', 'stats'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const player = await Player.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!player) return res.status(404).json({ message: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a player (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) return res.status(404).json({ message: 'Player not found' });
    res.json({ message: 'Player deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
