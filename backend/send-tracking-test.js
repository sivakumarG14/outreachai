require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const TEST_EMAILS = ['shaikbashah20@gmail.com', 'shaikbasharam20@gmail.com'];

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected\n');

  const Lead = require('./models/Lead');

  for (const email of TEST_EMAILS) {
    // Create or reuse a test lead with a trackingId
    let lead = await Lead.findOne({ email });
    if (!lead) {
      lead = await Lead.create({
        name: 'Tracking Test',
        email,
        company: 'Test Company',
        industry: 'Technology',
        language: 'en',
        status: 'Cold',
        trackingId: uuidv4(),
      });
      console.log(`Created test lead for ${email}`);
    } else if (!lead.trackingId) {
      lead.trackingId = uuidv4();
      // Use updateOne to bypass validation on old status values
      await Lead.updateOne({ _id: lead._id }, { trackingId: lead.trackingId });
    }

    const tid = lead.trackingId;
    const clickUrl  = `${BACKEND_URL}/track/${tid}`;
    const openPixel = `${BACKEND_URL}/track/open/${tid}`;
    const visitSnippet = `${BACKEND_URL}/tracker.js?tid=${tid}`;

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0f1a;color:#f0ece2;padding:32px;border-radius:12px;border:1px solid rgba(201,168,76,0.15)">
  <div style="text-align:center;margin-bottom:28px">
    <div style="display:inline-block;background:linear-gradient(145deg,#c9a84c,#a8872f);width:48px;height:48px;border-radius:12px;line-height:48px;font-size:22px;font-weight:900;color:#0a0f1a;font-family:Arial">B</div>
    <h1 style="color:#c9a84c;font-size:20px;margin:12px 0 4px">OutreachAI Tracking Verification</h1>
    <p style="color:#645e4f;font-size:13px;margin:0">Sent to: ${email}</p>
  </div>

  <p style="color:#a8a08e;font-size:14px;line-height:1.7;margin-bottom:24px">
    This email verifies that the OutreachAI CRM tracking system is working correctly.
    Please click each button below to confirm tracking is active.
  </p>

  <div style="background:#0f1526;border:1px solid rgba(201,168,76,0.1);border-radius:10px;padding:20px;margin-bottom:16px">
    <div style="font-size:12px;color:#c9a84c;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">1. Link Click Tracking</div>
    <p style="color:#a8a08e;font-size:13px;margin:0 0 14px">Click the button below — the CRM will log a click event and add +10 to your lead score.</p>
    <a href="${clickUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#a8872f);color:#0a0f1a;font-weight:700;font-size:13px;padding:10px 22px;border-radius:8px;text-decoration:none">
      ✅ Test Click Tracking →
    </a>
    <div style="margin-top:10px;font-size:11px;color:#645e4f;word-break:break-all">${clickUrl}</div>
  </div>

  <div style="background:#0f1526;border:1px solid rgba(201,168,76,0.1);border-radius:10px;padding:20px;margin-bottom:16px">
    <div style="font-size:12px;color:#c9a84c;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">2. Email Open Tracking</div>
    <p style="color:#a8a08e;font-size:13px;margin:0 0 14px">A 1×1 invisible pixel is embedded in this email. Opening it logs an open event (+5 score).</p>
    <div style="background:#151d32;border-radius:6px;padding:10px;font-size:11px;color:#645e4f;word-break:break-all">${openPixel}</div>
    <p style="color:#3ec97a;font-size:12px;margin:8px 0 0">✓ Pixel already fired when you opened this email</p>
  </div>

  <div style="background:#0f1526;border:1px solid rgba(201,168,76,0.1);border-radius:10px;padding:20px;margin-bottom:24px">
    <div style="font-size:12px;color:#c9a84c;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">3. Page Visit Tracking</div>
    <p style="color:#a8a08e;font-size:13px;margin:0 0 10px">Embed this snippet on any landing page to track visits:</p>
    <div style="background:#151d32;border-radius:6px;padding:10px;font-size:11px;color:#c9a84c;word-break:break-all">&lt;script src="${visitSnippet}"&gt;&lt;/script&gt;</div>
  </div>

  <div style="text-align:center;border-top:1px solid rgba(201,168,76,0.08);padding-top:20px">
    <p style="color:#645e4f;font-size:11px;margin:0">© ${new Date().getFullYear()} OutreachAI · AI-Powered Outreach</p>
    <p style="color:#645e4f;font-size:11px;margin:4px 0 0">Tracking ID: <span style="color:#c9a84c">${tid}</span></p>
  </div>
</div>
<img src="${openPixel}" width="1" height="1" style="display:none" alt="" />`;

    try {
      const info = await transporter.sendMail({
        from: `OutreachAI CRM <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `OutreachAI Tracking Verification — ${email}`,
        html,
        text: `OutreachAI Tracking Verification\n\nClick Tracking: ${clickUrl}\nOpen Pixel: ${openPixel}\nPage Snippet: <script src="${visitSnippet}"></script>\nTracking ID: ${tid}`,
      });
      console.log(`✅ Sent to ${email} — ${info.messageId}`);
    } catch (err) {
      console.log(`❌ Failed for ${email}: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
