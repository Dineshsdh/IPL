const express = require('express');
const AutoBid = require('../models/AutoBid');
const Team = require('../models/Team');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/autobid — Set auto-bid for a player
router.post('/', authenticate, async (req, res) => {
  try {
    const { teamId, playerId, maxAmount } = req.body;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (maxAmount > team.budget) {
      return res.status(400).json({ message: 'Max amount exceeds budget' });
    }

    const autoBid = await AutoBid.findOneAndUpdate(
      { team: teamId, player: playerId },
      { maxAmount, active: true },
      { upsert: true, new: true }
    );

    res.json({ message: 'Auto-bid set', autoBid });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/autobid/:playerId — Cancel auto-bid
router.delete('/:playerId', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({ owner: req.user._id });
    if (!team) return res.status(404).json({ message: 'Team not found' });

    await AutoBid.findOneAndUpdate(
      { team: team._id, player: req.params.playerId },
      { active: false }
    );

    res.json({ message: 'Auto-bid cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/autobid/my — Get my active auto-bids
router.get('/my', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({ owner: req.user._id });
    if (!team) return res.json([]);

    const autoBids = await AutoBid.find({ team: team._id, active: true })
      .populate('player', 'name role basePrice image');

    res.json(autoBids);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
