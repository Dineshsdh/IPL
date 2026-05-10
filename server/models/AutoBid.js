const mongoose = require('mongoose');

const autoBidSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  maxAmount: {
    type: Number,
    required: true,
    min: 0.2
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// One auto-bid per team per player
autoBidSchema.index({ team: 1, player: 1 }, { unique: true });

module.exports = mongoose.model('AutoBid', autoBidSchema);
