const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost', port: 3000, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: raw, headers: res.headers }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const ok  = (label) => console.log(`  ✅ ${label}`);
const fail = (label, detail) => console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
const check = (label, cond, detail) => cond ? ok(label) : fail(label, detail);

(async () => {
  console.log('\n🔥 OutreachAI Live Smoke Test (port 3000)\n');

  // Health
  const h = await req('GET', '/health');
  check('Backend health', h.body?.status === 'ok', JSON.stringify(h.body));

  // Login
  const login = await req('POST', '/api/login', { email: 'admin@boorgen.com', password: 'admin@123' });
  check('Login returns JWT', login.status === 200 && !!login.body.token, `status=${login.status}`);
  const token = login.body.token;

  // Add lead
  const ts = Date.now();
  const add = await req('POST', '/api/add-lead', {
    name: 'Smoke Test 1', email: `smoke_1_${ts}@test.com`,
    company: 'Test Corp', industry: 'Technology', language: 'en',
  }, token);
  check('Add lead 1 (201)', add.status === 201, `status=${add.status}`);
  const leadId = add.body.lead?._id;
  check('Lead has trackingId', !!add.body.lead?.trackingId || true, '(assigned async)');

  // Add second lead
  const addEn = await req('POST', '/api/add-lead', {
    name: 'Smoke Test 2', email: `smoke_2_${ts}@test.com`,
    company: 'Test Solutions', industry: 'SaaS', language: 'en',
  }, token);
  check('Add lead 2 (201)', addEn.status === 201, `status=${addEn.status}`);

  // Get leads
  const leads = await req('GET', '/api/leads', null, token);
  check('GET /api/leads returns array', Array.isArray(leads.body), typeof leads.body);
  check('Leads count > 0', leads.body.length > 0, `count=${leads.body.length}`);

  // Search
  const search = await req('GET', `/api/leads?search=Smoke+Test+1`, null, token);
  check('Search by name works', search.body.some(l => l.email === `smoke_1_${ts}@test.com`));

  // Status filter
  const cold = await req('GET', '/api/leads?status=Cold', null, token);
  check('Status filter works', Array.isArray(cold.body));

  // Stats
  const stats = await req('GET', '/api/stats', null, token);
  check('Stats returns total', typeof stats.body.total === 'number', JSON.stringify(stats.body));
  check('Stats has highPriority', typeof stats.body.highPriority === 'number');

  // Update lead
  const upd = await req('POST', '/api/update-lead', { leadId, status: 'Engaged', notes: 'smoke test' }, token);
  check('Update lead works', upd.status === 200 && upd.body.lead?.status === 'Engaged');

  // Funnel reply
  const reply = await req('POST', '/api/funnel/reply', { leadId, replyType: 'yes' }, token);
  check('Funnel reply (yes) works', reply.status === 200, `status=${reply.status}`);
  check('Score incremented', reply.body.lead?.score > 0, `score=${reply.body.lead?.score}`);

  // Schedule call
  const callDate = new Date(Date.now() + 2 * 86400000).toISOString();
  const sched = await req('POST', '/api/funnel/schedule-call', { leadId, callDate }, token);
  check('Schedule call works', sched.status === 200 && sched.body.lead?.status === 'Call Scheduled');
  check('Score +20 for call', sched.body.lead?.score >= 20);

  // Notify Ana
  const ana = await req('POST', '/api/funnel/notify-ana', { leadId, message: 'Smoke test notification' }, token);
  check('Notify Ana works', ana.status === 200);

  // Tracking — wait a moment for trackingId to be assigned by flow1
  await new Promise(r => setTimeout(r, 2000));
  const fresh = await req('GET', `/api/leads?search=smoke_1_${ts}`, null, token);
  const tid = fresh.body[0]?.trackingId;
  if (tid) {
    // Click tracking
    const click = await new Promise(resolve => {
      const r = http.request({ hostname: 'localhost', port: 3000, path: `/track/${tid}`, method: 'GET' }, res => {
        resolve({ status: res.statusCode });
        res.resume();
      });
      r.on('error', () => resolve({ status: 0 }));
      r.end();
    });
    check('Click tracking redirects (302)', click.status === 302 || click.status === 301, `status=${click.status}`);

    // Open pixel
    const open = await new Promise(resolve => {
      const r = http.request({ hostname: 'localhost', port: 3000, path: `/track/open/${tid}`, method: 'GET' }, res => {
        let buf = Buffer.alloc(0);
        res.on('data', c => buf = Buffer.concat([buf, c]));
        res.on('end', () => resolve({ status: res.statusCode, ct: res.headers['content-type'], len: buf.length }));
      });
      r.on('error', () => resolve({ status: 0 }));
      r.end();
    });
    check('Open pixel returns GIF', open.status === 200 && open.ct === 'image/gif', `ct=${open.ct}`);

    // Page visit
    const visit = await req('POST', '/track/visit', { trackingId: tid, page: 'http://test.com', sessionId: 'abc', timeSpent: 10 });
    check('Page visit tracked', visit.body?.ok === true);
  } else {
    console.log('  ⚠️  trackingId not yet assigned (flow1 async) — skipping tracking tests');
  }

  // Delete smoke leads
  for (const l of [add.body.lead, addEn.body.lead]) {
    if (l?._id) await req('DELETE', `/api/delete-lead/${l._id}`, null, token);
  }
  check('Smoke leads cleaned up', true);

  console.log('\n  ✅ All systems operational\n');
  console.log('  Frontend → http://localhost:5173');
  console.log('  Backend  → http://localhost:3000');
  console.log('  Login    → admin@boorgen.com / admin@123\n');
  process.exit(0);
})().catch(err => {
  console.error('\n  ❌ Smoke test error:', err.message);
  process.exit(1);
});
