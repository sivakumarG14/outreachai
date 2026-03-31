const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Event = require('../models/Event');
const { emit } = require('../services/socket');

// Parse user-agent into device/browser
function parseUA(ua = '') {
  const device = /mobile/i.test(ua) ? 'mobile' : 'desktop';
  let browser = 'unknown';
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua)) browser = 'Edge';
  return { device, browser };
}

// GET /track/:trackingId — link click tracking + redirect
router.get('/:trackingId', async (req, res) => {
  const { trackingId } = req.params;
  const redirect = req.query.url || process.env.FRONTEND_URL || 'https://outreachai.com';

  try {
    const lead = await Lead.findOne({ trackingId });
    if (lead) {
      lead.clickCount += 1;
      lead.score += 10; // +10 for link click
      lead.linkClicked = true;
      await lead.save();

      const ua = req.headers['user-agent'] || '';
      const { device, browser } = parseUA(ua);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      await Event.create({
        leadId: lead._id,
        type: 'click',
        metadata: { device, browser, ip, userAgent: ua },
      });

      emit('linkClicked', {
        leadId: lead._id,
        name: lead.name,
        company: lead.company,
        clickCount: lead.clickCount,
        score: lead.score,
      });
    }
  } catch (err) {
    console.error('Track click error:', err.message);
  }

  res.redirect(redirect);
});

// GET /track/open/:trackingId — 1x1 pixel email open tracking
router.get('/open/:trackingId', async (req, res) => {
  const { trackingId } = req.params;

  try {
    const lead = await Lead.findOne({ trackingId });
    if (lead) {
      lead.openCount += 1;
      lead.score += 5; // +5 for email open
      await lead.save();

      const ua = req.headers['user-agent'] || '';
      const { device, browser } = parseUA(ua);

      await Event.create({
        leadId: lead._id,
        type: 'open',
        metadata: { device, browser, userAgent: ua },
      });

      emit('emailOpened', {
        leadId: lead._id,
        name: lead.name,
        company: lead.company,
        openCount: lead.openCount,
        score: lead.score,
      });
    }
  } catch (err) {
    console.error('Track open error:', err.message);
  }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.send(pixel);
});

// POST /track/visit — page visit tracking from JS snippet
router.post('/visit', async (req, res) => {
  const { trackingId, page, sessionId, timeSpent } = req.body;
  if (!trackingId) return res.status(400).json({ error: 'trackingId required' });

  try {
    const lead = await Lead.findOne({ trackingId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const ua = req.headers['user-agent'] || '';
    const { device, browser } = parseUA(ua);

    await Event.create({
      leadId: lead._id,
      type: 'visit',
      metadata: { device, browser, page, sessionId, timeSpent, userAgent: ua },
    });

    emit('pageVisit', {
      leadId: lead._id,
      name: lead.name,
      page,
      timeSpent,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Track visit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
