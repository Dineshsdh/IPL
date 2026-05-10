const mongoose = require('mongoose');

const virtualPoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Pool name is required'],
    trim: true
  },
  joinCode: {
    type: String,
    required: true,
    unique: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mode: {
    type: String,
    enum: ['single', 'multi'],
    default: 'multi'
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  },
  // Players specific to this pool
  playerStates: [{
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    status: { type: String, enum: ['unsold', 'sold', 'in-auction'], default: 'unsold' },
    soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    soldToName: { type: String, default: '' },
    finalPrice: { type: Number, default: 0 }
  }],
  // Teams participating in this pool
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }]
}, { timestamps: true });

module.exports = mongoose.model('VirtualPool', virtualPoolSchema);
