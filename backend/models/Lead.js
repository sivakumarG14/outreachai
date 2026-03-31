const mongoose = require('mongoose');

const STATUSES = [
  'Cold',
  'Engaged',
  'Micro-Commitment',
  'Qualified',
  'Call Scheduled',
  'No Interest',
  'Cold – Re-Engage',
  'Closed / Lost',
];

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String, required: true },
  industry: { type: String, required: true },
  language: { type: String, enum: ['en', 'de'], default: 'en' },

  // State machine
  status: { type: String, enum: STATUSES, default: 'Cold' },
  flow: { type: Number, default: 1 },

  // AI Scoring
  score: { type: Number, default: 0 },

  // Funnel tracking
  lastEmailSent: { type: String, default: '' },
  lastEmailDate: { type: Date },
  replyReceived: { type: Boolean, default: false },
  replyType: { type: String, default: '' },
  linkClicked: { type: Boolean, default: false },
  addressProvided: { type: Boolean, default: false },
  callDate: { type: Date },
  reEngageAfter: { type: Date },

  // Behavior tracking
  trackingId: { type: String, unique: true, sparse: true },
  clickCount: { type: Number, default: 0 },
  openCount: { type: Number, default: 0 },

  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

leadSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Lead', leadSchema);
module.exports.STATUSES = STATUSES;
