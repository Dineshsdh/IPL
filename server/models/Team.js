const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    unique: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  poolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VirtualPool',
    default: null
  },
  budget: {
    type: Number,
    default: 120
  },
  maxBudget: {
    type: Number,
    default: 120
  },
  inPool: {
    type: Boolean,
    default: false
  },
  logo: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#F5A623'
  },
  maxPlayers: {
    type: Number,
    default: 25
  },
  maxOverseas: {
    type: Number,
    default: 8
  },
  players: [{
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    boughtAt: { type: Number }
  }],
  bidHistory: [{
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    playerName: String,
    amount: Number,
    won: Boolean,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
