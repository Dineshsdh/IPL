const express = require('express');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/suggestions/:teamId — AI-powered player suggestions
router.get('/:teamId', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate('players.player', 'role country');

    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Get current squad composition
    const squadRoles = {};
    let overseasCount = 0;
    for (const p of (team.players || [])) {
      if (!p.player) continue;
      const role = p.player.role || 'Batsman';
      squadRoles[role] = (squadRoles[role] || 0) + 1;
      if (p.player.country && !p.player.country.includes('🇮🇳')) {
        overseasCount++;
      }
    }

    // Find all unsold players within budget
    const unsoldPlayers = await Player.find({
      status: 'unsold',
      basePrice: { $lte: team.budget }
    });

    if (unsoldPlayers.length === 0) {
      return res.json({ suggestions: [], reason: 'No affordable unsold players' });
    }

    // Score each player
    const scored = unsoldPlayers.map(p => {
      let score = 0;

      // Role need — prioritize underrepresented roles
      const roleCount = squadRoles[p.role] || 0;
      const idealCounts = { 'Batsman': 5, 'Bowler': 5, 'All-rounder': 4, 'Wicketkeeper': 2 };
      const ideal = idealCounts[p.role] || 3;
      const roleNeed = Math.max(0, ideal - roleCount);
      score += roleNeed * 20;

      // Category bonus
      if (p.category === 'marquee') score += 15;
      if (p.category === 'uncapped') score += 5;

      // Price efficiency — cheaper is better (relative to budget)
      const priceRatio = 1 - (p.basePrice / team.budget);
      score += priceRatio * 10;

      // Overseas check — penalize if squad is full
      const isOverseas = p.country && !p.country.includes('🇮🇳');
      if (isOverseas && overseasCount >= (team.maxOverseas || 8)) {
        score -= 100; // can't buy
      }

      return { player: p, score, roleNeed };
    });

    // Sort by score desc, take top 5
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 5).filter(s => s.score > 0);

    res.json({
      suggestions: top.map(s => ({
        ...s.player.toObject(),
        suggestionScore: s.score,
        roleNeed: s.roleNeed
      })),
      squadComposition: squadRoles,
      overseasCount,
      budget: team.budget
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
