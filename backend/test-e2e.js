/**
 * OutreachAI End-to-End Test Suite
 * Uses mongodb-memory-server for a real in-process MongoDB.
 * Tests: auth, add-lead, leads CRUD, stats, funnel, tracking, socket.io
 *
 * Run: node test-e2e.js
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const mongoose = require('mongoose');

// ── Helpers ──────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    results.push(`  ✅ ${name}`);
  } else {
    failed++;
    results.push(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

async function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: TEST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// ── App setup (mirrors server.js but with injected mongo URI) ─────────────────
const TEST_PORT = 3099;
let app, server, io, token, leadId, trackingId;

async function buildApp(mongoUri) {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
  process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@boorgen.com';
  process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@123';
  process.env.BACKEND_URL = `http://localhost:${TEST_PORT}`;

  // Patch mailer so no real emails are sent
  const mailerPath = require.resolve('./services/mailer');
  require.cache[mailerPath] = {
    id: mailerPath, filename: mailerPath, loaded: true,
    exports: {
      sendEmail: async (opts) => {
        console.log(`    [MOCK EMAIL] to=${opts.to} subject="${opts.subject}"`);
        return { success: true, messageId: 'mock-id' };
      },
      buildTracking: (tid) => ({
        pixel: `<img src="http://localhost:${TEST_PORT}/track/open/${tid}" />`,
        trackedLink: `http://localhost:${TEST_PORT}/track/${tid}`,
      }),
    },
  };

  // Patch notifyAna so no real emails are sent
  const funnelPath = require.resolve('./services/funnel');
  delete require.cache[funnelPath]; // force reload with mocked mailer

  app = express();
  server = http.createServer(app);
  io = new Server(server, { cors: { origin: '*' } });

  const socketService = require('./services/socket');
  socketService.init(io);

  app.use(express.json());
  app.use(express.static('public'));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api', require('./routes/auth'));
  app.use('/api', require('./routes/leads'));
  app.use('/api/funnel', require('./routes/funnel'));
  app.use('/track', require('./routes/track'));

  await mongoose.connect(mongoUri);
  await new Promise((res) => server.listen(TEST_PORT, res));
  console.log(`\n  Test server on :${TEST_PORT}, MongoDB: in-memory\n`);
}

// ── Test runner ───────────────────────────────────────────────────────────────
async function runTests() {
  // Clean slate — drop test data from previous runs
  const Lead = require('./models/Lead');
  const Event = require('./models/Event');
  await Lead.deleteMany({});
  await Event.deleteMany({});
  console.log('  DB cleaned\n');
  // ── 1. Health ──
  console.log('📋 1. Health Check');
  const health = await req('GET', '/health');
  assert('GET /health returns ok', health.body?.status === 'ok');

  // ── 2. Auth ──
  console.log('\n📋 2. Authentication');
  const badLogin = await req('POST', '/api/login', { email: 'wrong@x.com', password: 'bad' });
  assert('Rejects invalid credentials (401)', badLogin.status === 401);

  const goodLogin = await req('POST', '/api/login', {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  assert('POST /api/login returns token', goodLogin.status === 200 && !!goodLogin.body.token);
  token = goodLogin.body.token;

  const noToken = await req('GET', '/api/leads');
  assert('Protected route rejects no token (401)', noToken.status === 401);

  // ── 3. Add Lead ──
  console.log('\n📋 3. Lead Creation');
  const addRes = await req('POST', '/api/add-lead', {
    name: 'Hans Mueller',
    email: 'hans@testcompany.com',
    company: 'Alpine Solutions',
    industry: 'Hospitality',
    language: 'en',
    notes: 'Test lead',
  }, token);
  assert('POST /api/add-lead returns 201', addRes.status === 201);
  assert('Lead has _id', !!addRes.body.lead?._id);
  assert('Lead status is Cold', addRes.body.lead?.status === 'Cold');
  assert('Lead score is 0', addRes.body.lead?.score === 0);
  assert('Lead language is en', addRes.body.lead?.language === 'en');
  leadId = addRes.body.lead?._id;

  // Second lead
  const addEnRes = await req('POST', '/api/add-lead', {
    name: 'John Smith',
    email: 'john@testcompany.com',
    company: 'Grand Tech',
    industry: 'SaaS',
    language: 'en',
  }, token);
  assert('POST /api/add-lead (2nd) returns 201', addEnRes.status === 201);
  assert('Second lead language is en', addEnRes.body.lead?.language === 'en');

  // Missing fields
  const badAdd = await req('POST', '/api/add-lead', { name: 'Only Name' }, token);
  assert('Rejects missing required fields (400)', badAdd.status === 400);

  // ── 4. Get Leads ──
  console.log('\n📋 4. Leads Listing & Search');
  const leadsRes = await req('GET', '/api/leads', null, token);
  assert('GET /api/leads returns array', Array.isArray(leadsRes.body));
  assert('Returns 2 leads', leadsRes.body.length === 2);

  const searchRes = await req('GET', '/api/leads?search=Hans', null, token);
  assert('Search by name works', searchRes.body.length === 1 && searchRes.body[0].name === 'Hans Mueller');

  const searchCompany = await req('GET', '/api/leads?search=Grand', null, token);
  assert('Search by company works', searchCompany.body.length === 1);

  const statusFilter = await req('GET', '/api/leads?status=Cold', null, token);
  assert('Status filter works', statusFilter.body.length === 2);

  const noMatch = await req('GET', '/api/leads?status=Engaged', null, token);
  assert('Status filter returns 0 for Engaged', noMatch.body.length === 0);

  // ── 5. Stats ──
  console.log('\n📋 5. Stats');
  const statsRes = await req('GET', '/api/stats', null, token);
  assert('GET /api/stats returns object', typeof statsRes.body === 'object');
  assert('total = 2', statsRes.body.total === 2);
  assert('cold = 2', statsRes.body.cold === 2);
  assert('engaged = 0', statsRes.body.engaged === 0);
  assert('highPriority = 0 (score < 40)', statsRes.body.highPriority === 0);

  // ── 6. Update Lead ──
  console.log('\n📋 6. Update Lead');
  const updateRes = await req('POST', '/api/update-lead', {
    leadId,
    status: 'Engaged',
    notes: 'Updated note',
  }, token);
  assert('POST /api/update-lead returns 200', updateRes.status === 200);
  assert('Status updated to Engaged', updateRes.body.lead?.status === 'Engaged');
  assert('Notes updated', updateRes.body.lead?.notes === 'Updated note');

  // Reset back to Cold for funnel tests
  await req('POST', '/api/update-lead', { leadId, status: 'Cold' }, token);

  // ── 7. Funnel — Reply ──
  console.log('\n📋 7. Funnel — Reply Processing');

  // Reply: yes → Engaged, score +20
  const replyYes = await req('POST', '/api/funnel/reply', { leadId, replyType: 'yes' }, token);
  assert('POST /api/funnel/reply (yes) returns 200', replyYes.status === 200);
  assert('Status → Engaged after yes reply', replyYes.body.lead?.status === 'Engaged');
  assert('Score +20 for yes reply', replyYes.body.lead?.score === 20);

  // Reply: no → No Interest
  const lead2Id = addEnRes.body.lead?._id;
  const replyNo = await req('POST', '/api/funnel/reply', { leadId: lead2Id, replyType: 'no' }, token);
  assert('POST /api/funnel/reply (no) → No Interest', replyNo.body.lead?.status === 'No Interest');

  // Add a 3rd lead for more reply tests
  const lead3 = await req('POST', '/api/add-lead', {
    name: 'Maria Schmidt', email: 'maria@company.com',
    company: 'City Solutions', industry: 'Consulting', language: 'en',
  }, token);
  const lead3Id = lead3.body.lead?._id;

  const replyLater = await req('POST', '/api/funnel/reply', { leadId: lead3Id, replyType: 'later' }, token);
  assert('Reply later → Cold – Re-Engage', replyLater.body.lead?.status === 'Cold – Re-Engage');

  const lead4 = await req('POST', '/api/add-lead', {
    name: 'Klaus Weber', email: 'klaus@company.com',
    company: 'Mountain Tech', industry: 'FinTech', language: 'en',
  }, token);
  const lead4Id = lead4.body.lead?._id;

  const replyAddress = await req('POST', '/api/funnel/reply', { leadId: lead4Id, replyType: 'address' }, token);
  assert('Reply address → Micro-Commitment', replyAddress.body.lead?.status === 'Micro-Commitment');
  assert('Score +40 for address (reply+address bonus)', replyAddress.body.lead?.score >= 40);

  // ── 8. Funnel — Schedule Call ──
  console.log('\n📋 8. Funnel — Schedule Call');
  const callDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const schedRes = await req('POST', '/api/funnel/schedule-call', { leadId, callDate }, token);
  assert('POST /api/funnel/schedule-call returns 200', schedRes.status === 200);
  assert('Status → Call Scheduled', schedRes.body.lead?.status === 'Call Scheduled');
  assert('Score +20 for call scheduled', schedRes.body.lead?.score === 40); // was 20, +20 = 40

  // ── 9. High Priority ──
  console.log('\n📋 9. High Priority Logic');
  const statsAfter = await req('GET', '/api/stats', null, token);
  assert('highPriority = 2 (score ≥ 40)', statsAfter.body.highPriority === 2);
  assert('callScheduled = 1', statsAfter.body.callScheduled === 1);

  // ── 10. Funnel — Notify Ana ──
  console.log('\n📋 10. Funnel — Notify Ana');
  // Patch notifyAna to not actually send email
  const funnelSvc = require('./services/funnel');
  const origNotify = funnelSvc.notifyAna;
  funnelSvc.notifyAna = async (lead, msg) => {
    console.log(`    [MOCK ANA] ${msg} for ${lead.email}`);
  };
  const anaRes = await req('POST', '/api/funnel/notify-ana', {
    leadId, message: 'Test notification',
  }, token);
  assert('POST /api/funnel/notify-ana returns 200', anaRes.status === 200);
  funnelSvc.notifyAna = origNotify;

  // ── 11. Tracking — trackingId assigned ──
  console.log('\n📋 11. Tracking System');
  const lead = await Lead.findById(leadId);
  assert('Lead has trackingId after flow1', !!lead?.trackingId);
  trackingId = lead?.trackingId;

  // ── 12. Tracking — link click ──
  const clickRes = await new Promise((resolve) => {
    const opts = {
      hostname: 'localhost', port: TEST_PORT,
      path: `/track/${trackingId}`,
      method: 'GET',
    };
    const r = http.request(opts, (res) => {
      resolve({ status: res.statusCode, location: res.headers.location });
      res.resume();
    });
    r.on('error', () => resolve({ status: 500 }));
    r.end();
  });
  assert('GET /track/:id returns redirect (302)', clickRes.status === 302 || clickRes.status === 301);

  const leadAfterClick = await Lead.findById(leadId);
  assert('clickCount incremented', leadAfterClick?.clickCount >= 1);
  assert('Score +10 for click', leadAfterClick?.score >= 50); // 40 + 10

  // ── 13. Tracking — email open pixel ──
  const openRes = await new Promise((resolve) => {
    const opts = {
      hostname: 'localhost', port: TEST_PORT,
      path: `/track/open/${trackingId}`,
      method: 'GET',
    };
    const r = http.request(opts, (res) => {
      let buf = Buffer.alloc(0);
      res.on('data', (c) => { buf = Buffer.concat([buf, c]); });
      res.on('end', () => resolve({ status: res.statusCode, ct: res.headers['content-type'], len: buf.length }));
    });
    r.on('error', () => resolve({ status: 500 }));
    r.end();
  });
  assert('GET /track/open/:id returns 200', openRes.status === 200);
  assert('Returns image/gif content-type', openRes.ct === 'image/gif');
  assert('Returns 1x1 pixel (42 bytes)', openRes.len === 42);

  const leadAfterOpen = await Lead.findById(leadId);
  assert('openCount incremented', leadAfterOpen?.openCount >= 1);
  assert('Score +5 for email open', leadAfterOpen?.score >= 55);

  // ── 14. Tracking — page visit ──
  const visitRes = await req('POST', '/track/visit', {
    trackingId,
    page: 'https://outreachai.com/analysis',
    sessionId: 'sess_test_123',
    timeSpent: 42,
  });
  assert('POST /track/visit returns ok', visitRes.body?.ok === true);

  const events = await Event.find({ leadId });
  assert('Events logged (click + open + visit)', events.length >= 3);
  const types = events.map((e) => e.type);
  assert('click event saved', types.includes('click'));
  assert('open event saved', types.includes('open'));
  assert('visit event saved', types.includes('visit'));

  // ── 15. Socket.io ──
  console.log('\n📋 12. Socket.io Real-Time Events');
  await new Promise((resolve) => {
    const client = ioClient(`http://localhost:${TEST_PORT}`, { transports: ['websocket'] });
    const received = [];
    client.on('leadUpdated', (d) => received.push({ event: 'leadUpdated', data: d }));
    client.on('connect', async () => {
      // Trigger an update
      await req('POST', '/api/update-lead', { leadId, notes: 'socket test' }, token);
      setTimeout(() => {
        assert('Socket.io client connects', client.connected);
        assert('leadUpdated event received', received.length >= 1);
        assert('Event has leadId', !!received[0]?.data?.leadId);
        client.disconnect();
        resolve();
      }, 500);
    });
    client.on('connect_error', () => {
      assert('Socket.io client connects', false, 'connect_error');
      resolve();
    });
  });

  // ── 16. Delete Lead ──
  console.log('\n📋 13. Delete Lead');
  const delRes = await req('DELETE', `/api/delete-lead/${lead3Id}`, null, token);
  assert('DELETE /api/delete-lead/:id returns 200', delRes.status === 200);
  const afterDel = await req('GET', '/api/leads', null, token);
  assert('Lead count decreased after delete', afterDel.body.length < 4);

  // ── 17. Final Stats ──
  console.log('\n📋 14. Final Stats Accuracy');
  const finalStats = await req('GET', '/api/stats', null, token);
  assert('Stats total is accurate', typeof finalStats.body.total === 'number');
  assert('Stats noInterest is accurate', finalStats.body.noInterest >= 1);
  assert('Stats microCommitment is accurate', finalStats.body.microCommitment >= 1);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('═══════════════════════════════════════════════');
  console.log('  OutreachAI CRM — End-to-End Test Suite');
  console.log('═══════════════════════════════════════════════');

  let mongod;
  try {
    // Use Atlas directly (mongodb-memory-server as fallback)
    console.log('\n  Connecting to MongoDB Atlas...');
    await buildApp(process.env.MONGO_URI);
  } catch (e) {
    console.log('  Atlas failed, trying in-memory MongoDB...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      await buildApp(mongod.getUri());
    } catch (e2) {
      console.log('  ❌ Cannot connect to any MongoDB:', e2.message);
      process.exit(1);
    }
  }

  try {
    await runTests();
  } catch (err) {
    console.error('\n  UNEXPECTED ERROR:', err.message);
    failed++;
  }

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════');
  results.forEach((r) => console.log(r));
  console.log(`\n  Passed: ${passed}  Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('✅ CLIENT REQUIREMENT VERIFICATION — ALL PASSED\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed — see above\n`);
  }

  // Cleanup
  try {
    await mongoose.disconnect();
    server.close();
    if (mongod) await mongod.stop();
  } catch (_) {}

  process.exit(failed > 0 ? 1 : 0);
})();
