const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Lead = require('../models/Lead');
const { emit } = require('../services/socket');
const {
  flow1_entry,
  processReply,
  flow4_behaviorTrigger,
  scheduleCall,
  notifyAna,
} = require('../services/funnel');

// POST /api/funnel/flow1 — n8n trigger
router.post('/flow1', async (req, res) => {
  const secret = req.headers['x-n8n-secret'];
  if (!process.env.N8N_SECRET || secret !== process.env.N8N_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { leadId } = req.body;
  if (!leadId) return res.status(400).json({ error: 'leadId required' });
  try {
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (lead.lastEmailSent) return res.json({ message: 'Flow already started', lead });
    await flow1_entry(lead);
    res.json({ message: 'Flow 1 triggered', lead });
  } catch (err) {
    console.error('funnel/flow1 error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funnel/reply
router.post('/reply', auth, async (req, res) => {
  try {
    const { leadId, replyType, replyText } = req.body;
    if (!leadId || !replyType) return res.status(400).json({ error: 'leadId and replyType required' });

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Process reply in background so response is immediate
    processReply(lead, replyType, replyText || '')
      .catch(err => console.error('processReply error:', err.message));

    // Return current lead state (score/status update happens async)
    // Re-fetch after brief moment for accurate response
    await new Promise(r => setTimeout(r, 2000));
    const updated = await Lead.findById(leadId);
    emit('leadUpdated', { leadId: updated._id, status: updated.status, score: updated.score });
    res.json({ message: 'Reply processed', lead: updated });
  } catch (err) {
    console.error('funnel/reply error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funnel/link-click
router.post('/link-click', auth, async (req, res) => {
  try {
    const { leadId } = req.body;
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    lead.linkClicked = true;
    await flow4_behaviorTrigger(lead);
    res.json({ message: 'Link click processed', lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funnel/schedule-call
router.post('/schedule-call', auth, async (req, res) => {
  try {
    const { leadId, callDate } = req.body;
    if (!leadId || !callDate) return res.status(400).json({ error: 'leadId and callDate required' });

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    await scheduleCall(lead, callDate);
    res.json({ message: 'Call scheduled', lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funnel/close
router.post('/close', auth, async (req, res) => {
  try {
    const { leadId, status, notes } = req.body;
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    lead.status = status || 'Closed / Lost';
    if (notes) lead.notes = notes;
    await lead.save();

    emit('leadUpdated', { leadId: lead._id, status: lead.status });
    res.json({ message: 'Lead closed', lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funnel/notify-ana
router.post('/notify-ana', auth, async (req, res) => {
  try {
    const { leadId, message } = req.body;
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Respond immediately, send email in background
    res.json({ message: 'Ana notified' });
    notifyAna(lead, message || 'Manual notification from CRM')
      .catch(err => console.error('notifyAna error:', err.message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/funnel/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const statuses = [
      'Cold', 'Engaged', 'Micro-Commitment', 'Qualified',
      'Call Scheduled', 'No Interest', 'Cold – Re-Engage', 'Closed / Lost',
    ];
    const counts = {};
    for (const s of statuses) {
      counts[s] = await Lead.countDocuments({ status: s });
    }
    const highPriority = await Lead.countDocuments({ score: { $gte: 40 } });
    res.json({ ...counts, highPriority });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
