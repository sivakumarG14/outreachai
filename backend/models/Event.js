const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  type: { type: String, enum: ['click', 'open', 'visit'], required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: {
    device: String,
    browser: String,
    page: String,
    ip: String,
    userAgent: String,
    sessionId: String,
    timeSpent: Number,
  },
});

module.exports = mongoose.model('Event', eventSchema);
