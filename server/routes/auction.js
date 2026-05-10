const express = require('express');
const Player = require('../models/Player');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get auction status
router.get('/status', authenticate, async (req, res) => {
  try {
    const totalPlayers = await Player.countDocuments();
    const soldPlayers = await Player.countDocuments({ status: 'sold' });
    const unsoldPlayers = await Player.countDocuments({ status: 'unsold' });
    const inAuction = await Player.findOne({ status: 'in-auction' });

    res.json({
      totalPlayers,
      soldPlayers,
      unsoldPlayers,
      currentPlayer: inAuction,
      isActive: !!inAuction
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reset auction (admin only)
router.post('/reset', authenticate, requireAdmin, async (req, res) => {
  try {
    await Player.updateMany({}, { status: 'unsold', soldTo: null, soldToName: '', finalPrice: 0 });
    res.json({ message: 'Auction reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
