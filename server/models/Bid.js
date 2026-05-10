const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  teamName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Bid', bidSchema);
