const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true
  },
  role: {
    type: String,
    enum: ['Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper'],
    required: [true, 'Player role is required']
  },
  category: {
    type: String,
    enum: ['marquee', 'capped', 'uncapped'],
    default: 'capped'
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: 0.2
  },
  image: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },
  season: {
    type: String,
    default: ''
  },
  originalTeam: {
    type: String,
    default: ''
  },
  stats: {
    matches: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    economy: { type: Number, default: 0 }
  },
  soldTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  soldToName: {
    type: String,
    default: ''
  },
  finalPrice: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['unsold', 'sold', 'in-auction'],
    default: 'unsold'
  }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
