const express = require('express');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Bid = require('../models/Bid');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/results/summary — Full auction summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const totalPlayers = await Player.countDocuments();
    const soldPlayers = await Player.find({ status: 'sold' })
      .populate('soldTo', 'name color')
      .sort({ finalPrice: -1 });
    const unsoldPlayers = await Player.find({ status: 'unsold' })
      .sort({ basePrice: -1 });

    // Team spending
    const teams = await Team.find()
      .populate('owner', 'name')
      .populate('players.player', 'name role finalPrice image category');

    const teamSummaries = teams.map(t => ({
      _id: t._id,
      name: t.name,
      budget: t.budget,
      maxBudget: t.maxBudget || 120,
      spent: parseFloat(((t.maxBudget || 120) - t.budget).toFixed(2)),
      playerCount: t.players?.length || 0,
      players: t.players || [],
      color: t.color
    }));

    // Highest purchase
    const highestPurchase = soldPlayers.length > 0 ? {
      player: soldPlayers[0].name,
      price: soldPlayers[0].finalPrice,
      team: soldPlayers[0].soldToName
    } : null;

    // Total spent across all teams
    const totalSpent = teamSummaries.reduce((sum, t) => sum + t.spent, 0);

    // Category breakdown
    const byCategory = {
      marquee: { sold: 0, unsold: 0 },
      capped: { sold: 0, unsold: 0 },
      uncapped: { sold: 0, unsold: 0 }
    };
    for (const p of soldPlayers) {
      const cat = p.category || 'capped';
      if (byCategory[cat]) byCategory[cat].sold++;
    }
    for (const p of unsoldPlayers) {
      const cat = p.category || 'capped';
      if (byCategory[cat]) byCategory[cat].unsold++;
    }

    res.json({
      totalPlayers,
      soldCount: soldPlayers.length,
      unsoldCount: unsoldPlayers.length,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      highestPurchase,
      soldPlayers,
      unsoldPlayers,
      teamSummaries,
      byCategory
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/results/bid-history — Full bid log
router.get('/bid-history', authenticate, async (req, res) => {
  try {
    const bids = await Bid.find()
      .populate('player', 'name role image category')
      .populate('team', 'name color')
      .sort({ timestamp: -1 })
      .limit(500);

    res.json(bids);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
