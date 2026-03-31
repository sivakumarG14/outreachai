const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Lead = require('../models/Lead');
const { emit } = require('../services/socket');
const { triggerWebhook } = require('../services/webhook');
const { generateEmail } = require('../services/groq');
const { sendEmail } = require('../services/mailer');

// POST /api/add-lead
router.post('/add-lead', auth, async (req, res) => {
  try {
    const { name, email, company, industry, notes } = req.body;
    if (!name || !email || !company || !industry) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const lead = await Lead.create({ name, email, company, industry, notes, language: 'en' });

    // FLOW 1: Send cold contact email immediately (non-blocking)
    const { flow1_entry } = require('../services/funnel');
    flow1_entry(lead).catch((err) => console.error('Flow 1 error:', err.message));

    // Emit real-time event
    emit('leadAdded', {
      leadId: lead._id,
      name: lead.name,
      company: lead.company,
      status: lead.status,
      score: lead.score,
    });

    // n8n webhook (optional, non-blocking)
    triggerWebhook({
      name, email, company, industry,
      leadId: lead._id.toString(),
      type: 'initial',
    }).catch((err) => console.error('Webhook trigger failed:', err.message));

    res.status(201).json({ message: 'Lead added', lead });
  } catch (err) {
    console.error('add-lead error:', err.message);
    res.status(500).json({ error: 'Failed to add lead' });
  }
});

// GET /api/leads
router.get('/leads', auth, async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } },
      ];
    }
    const leads = await Lead.find(filter).sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    console.error('get-leads error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// POST /api/update-lead
router.post('/update-lead', auth, async (req, res) => {
  try {
    const { leadId, name, email, company, industry, status, notes, score } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId required' });
    const update = {};
    if (name)              update.name = name;
    if (email)             update.email = email;
    if (company)           update.company = company;
    if (industry)          update.industry = industry;
    if (status)            update.status = status;
    if (notes !== undefined) update.notes = notes;
    if (score !== undefined) update.score = Number(score);
    const lead = await Lead.findByIdAndUpdate(leadId, update, { new: true });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    emit('leadUpdated', { leadId: lead._id, status: lead.status, score: lead.score });
    res.json({ message: 'Lead updated', lead });
  } catch (err) {
    console.error('update-lead error:', err.message);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// GET /api/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const [total, cold, engaged, microCommitment, callScheduled, noInterest, highPriority] =
      await Promise.all([
        Lead.countDocuments(),
        Lead.countDocuments({ status: 'Cold' }),
        Lead.countDocuments({ status: 'Engaged' }),
        Lead.countDocuments({ status: 'Micro-Commitment' }),
        Lead.countDocuments({ status: 'Call Scheduled' }),
        Lead.countDocuments({ status: 'No Interest' }),
        Lead.countDocuments({ score: { $gte: 40 } }),
      ]);
    res.json({ total, cold, engaged, microCommitment, callScheduled, noInterest, highPriority });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/send-outreach — called by n8n or dashboard
router.post('/send-outreach', async (req, res) => {
  const secret = req.headers['x-n8n-secret'];
  const authHeader = req.headers.authorization;

  let authorized = false;
  if (secret && secret === process.env.N8N_SECRET) {
    authorized = true;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      authorized = true;
    } catch { }
  }
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  const { leadId, type = 'initial' } = req.body;
  if (!leadId) return res.status(400).json({ error: 'leadId required' });

  let lead;
  try {
    lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const emailBody = await generateEmail({
      name: lead.name, company: lead.company,
      industry: lead.industry, type,
    });

    const result = await sendEmail({ to: lead.email, company: lead.company, body: emailBody, trackingId: lead.trackingId });

    if (result.success) {
      lead.status = 'Engaged';
      lead.notes = `Email sent on ${new Date().toISOString()}`;
      await lead.save();
      emit('leadUpdated', { leadId: lead._id, status: lead.status });
      return res.json({ message: 'Email sent and lead updated', lead });
    } else {
      return res.status(500).json({ error: 'Email sending failed', detail: result.error });
    }
  } catch (err) {
    console.error('send-outreach error:', err.message);
    return res.status(500).json({ error: 'Outreach process failed', detail: err.message });
  }
});

// POST /api/n8n-update-lead
router.post('/n8n-update-lead', async (req, res) => {
  const secret = req.headers['x-n8n-secret'];
  if (!process.env.N8N_SECRET || secret !== process.env.N8N_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { leadId, status, notes } = req.body;
  if (!leadId) return res.status(400).json({ error: 'leadId required' });
  try {
    const update = {};
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;
    const lead = await Lead.findByIdAndUpdate(leadId, update, { new: true });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    emit('leadUpdated', { leadId: lead._id, status: lead.status });
    res.json({ message: 'Lead updated', lead });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/delete-lead/:id
router.delete('/delete-lead/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    emit('leadUpdated', { leadId: req.params.id, deleted: true });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;
