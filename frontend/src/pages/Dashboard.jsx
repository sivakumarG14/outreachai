import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import AddLeadForm from '../components/AddLeadForm';
import LeadsTable from '../components/LeadsTable';
import StatsBar from '../components/StatsBar';

const FLOW_LABELS = {
  cold_contact: 'Flow 1 – First Contact',
  reminder_1: 'Flow 2 – Reminder 1',
  trust_building: 'Flow 3 – Trust Building',
  reminder_2: 'Flow 4 – Reminder 2',
  behavior_trigger: 'Flow 4 – Click Trigger',
  qualification_address: 'Flow 5 – Address',
  qualification_spin: 'Flow 5 – SPIN',
  call_warmup: 'Flow 6 – Call Warm-up',
  re_engagement: 'Flow 8 – Re-engagement',
  cold_exit: 'Cold Exit',
};

const STATUS_COLORS = {
  'Cold': '#8895a7', 'Engaged': '#e8b84a', 'Micro-Commitment': '#9a6ef5',
  'Qualified': '#3ec97a', 'Call Scheduled': '#40c4c4',
  'No Interest': '#e85454', 'Cold – Re-Engage': '#e89040', 'Closed / Lost': '#5a5347',
};

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsForm, setSettingsForm] = useState({ adminEmail: '', adminPassword: '', anaEmail: '', gmailUser: '', gmailPass: '' });
  const navigate = useNavigate();

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/leads', { params });
      setLeads(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  const fetchStats = useCallback(async () => {
    try { const { data } = await api.get('/stats'); setStats(data); }
    catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchLeads(); fetchStats(); }, [fetchLeads, fetchStats]);

  useEffect(() => {
    socket.connect();
    const refresh = () => { fetchLeads(); fetchStats(); };
    socket.on('leadAdded', refresh); socket.on('leadUpdated', refresh);
    socket.on('linkClicked', refresh); socket.on('emailOpened', refresh);
    socket.on('callScheduled', refresh); socket.on('pageVisit', refresh);
    return () => {
      socket.off('leadAdded', refresh); socket.off('leadUpdated', refresh);
      socket.off('linkClicked', refresh); socket.off('emailOpened', refresh);
      socket.off('callScheduled', refresh); socket.off('pageVisit', refresh);
      socket.disconnect();
    };
  }, [fetchLeads, fetchStats]);

  const refresh = () => { fetchLeads(); fetchStats(); };
  const logout = () => { localStorage.removeItem('token'); navigate('/login'); };
  const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'contacts', label: 'Contacts', icon: 'people' },
    { id: 'campaigns', label: 'Campaigns', icon: 'campaign' },
    { id: 'reports', label: 'Reports', icon: 'analytics' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const PAGE_TITLES = {
    dashboard: 'Lead Outreach CRM', contacts: 'Contacts',
    campaigns: 'Campaigns & Flows', reports: 'Reports & Analytics',
    settings: 'Settings',
  };

  // ── Page: Contacts ──
  const renderContacts = () => (
    <div>
      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <span className="material-symbols-outlined" style={s.searchIcon}>search</span>
          <input placeholder="Search name, email, company..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40, background: 'var(--bg2)' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ width: 180, background: 'var(--bg2)' }}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || statusFilter) && (
          <button className="btn-ghost" onClick={() => { setSearch(''); setStatus(''); }}
            style={{ height: 42, padding: '0 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>filter_alt_off</span> Reset
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {leads.map(lead => (
          <div key={lead._id} className="card" style={{ padding: 20, cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ ...s.avatar, width: 42, height: 42, fontSize: 16, borderRadius: 10 }}>
                {lead.name?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, fontFamily: "'Outfit',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{lead.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <span style={{ background: 'var(--brand-gold-glow)', color: 'var(--brand-gold-light)', padding: '3px 10px', borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>business</span>{lead.company}
              </span>
              <span style={{ background: 'var(--bg3)', color: 'var(--text3)', padding: '3px 10px', borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>category</span>{lead.industry}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${STATUS_COLORS[lead.status]}18`, color: STATUS_COLORS[lead.status] || '#8895a7' }}>
                {lead.status}
              </span>
              <span style={{ fontWeight: 800, fontSize: 15, fontFamily: "'Outfit',sans-serif", color: lead.score >= 40 ? 'var(--orange)' : 'var(--text3)', background: lead.score >= 40 ? 'var(--orange-bg)' : 'transparent', padding: '2px 8px', borderRadius: 6 }}>
                {lead.score || 0} pts
              </span>
            </div>
            {lead.notes && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: 10, fontStyle: 'italic' }}>{lead.notes}</div>}
          </div>
        ))}
        {!leads.length && <div style={{ color: 'var(--text3)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>No contacts found</div>}
      </div>
    </div>
  );

  // ── Page: Campaigns ──
  const renderCampaigns = () => {
    const flowGroups = {};
    leads.forEach(l => {
      const key = l.lastEmailSent || 'No email yet';
      if (!flowGroups[key]) flowGroups[key] = [];
      flowGroups[key].push(l);
    });
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Object.entries(flowGroups).map(([flow, fLeads]) => (
            <div key={flow} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, fontFamily: "'Outfit',sans-serif" }}>{FLOW_LABELS[flow] || flow}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{fLeads.length} Lead{fLeads.length !== 1 ? 's' : ''}</div>
                </div>
                <span style={{ background: 'var(--brand-gold-glow)', color: 'var(--brand-gold)', fontWeight: 800, fontSize: 20, fontFamily: "'Outfit',sans-serif", padding: '4px 12px', borderRadius: 8 }}>{fLeads.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {fLeads.slice(0, 4).map(l => (
                  <div key={l._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg3)', borderRadius: 8 }}>
                    <div style={{ ...s.avatar, width: 26, height: 26, fontSize: 11, borderRadius: 6, flexShrink: 0 }}>{l.name?.charAt(0)?.toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{l.company}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLORS[l.status] || '#8895a7', flexShrink: 0 }}>{l.score}p</span>
                  </div>
                ))}
                {fLeads.length > 4 && <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', paddingTop: 4 }}>+{fLeads.length - 4} more</div>}
              </div>
            </div>
          ))}
          {!leads.length && <div style={{ color: 'var(--text3)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>No active campaigns</div>}
        </div>
      </div>
    );
  };

  // ── Page: Reports ──
  const renderReports = () => {
    const total = stats.total || 0;
    const pct = (n) => total ? Math.round((n / total) * 100) : 0;
    const bars = [
      { label: 'Cold', value: stats.cold || 0, color: '#8895a7' },
      { label: 'Engaged', value: stats.engaged || 0, color: '#e8b84a' },
      { label: 'Micro-Commitment', value: stats.microCommitment || 0, color: '#9a6ef5' },
      { label: 'Call Scheduled', value: stats.callScheduled || 0, color: '#40c4c4' },
      { label: 'No Interest', value: stats.noInterest || 0, color: '#e85454' },
      { label: 'High Priority', value: stats.highPriority || 0, color: '#e89040' },
    ];
    const avgScore = leads.length ? Math.round(leads.reduce((a, l) => a + (l.score || 0), 0) / leads.length) : 0;
    const topLeads = [...leads].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Funnel Breakdown */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, fontFamily: "'Outfit',sans-serif", marginBottom: 20 }}>Funnel Overview</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bars.map(b => (
              <div key={b.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{b.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: b.color }}>{b.value} ({pct(b.value)}%)</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct(b.value)}%`, background: b.color, borderRadius: 3, transition: 'width 0.6s var(--ease)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score Stats */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, fontFamily: "'Outfit',sans-serif", marginBottom: 20 }}>Score Analysis</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Leads', value: total, color: 'var(--brand-gold)' },
              { label: 'Avg Score', value: avgScore, color: 'var(--purple)' },
              { label: 'High Priority', value: stats.highPriority || 0, color: 'var(--orange)' },
              { label: 'Conversion Rate', value: `${pct((stats.callScheduled || 0) + (stats.microCommitment || 0))}%`, color: 'var(--green)' },
            ].map(m => (
              <div key={m.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: m.color, fontFamily: "'Outfit',sans-serif" }}>{m.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text2)', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top 5 Leads</div>
          {topLeads.map((l, i) => (
            <div key={l._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < topLeads.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', width: 16, textAlign: 'center' }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{l.company}</div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 14, color: l.score >= 40 ? 'var(--orange)' : 'var(--text2)', fontFamily: "'Outfit',sans-serif" }}>{l.score}</span>
            </div>
          ))}
          {!topLeads.length && <div style={{ color: 'var(--text3)', fontSize: 13 }}>No data yet</div>}
        </div>

        {/* Email Activity */}
        <div className="card" style={{ padding: 24, gridColumn: '1 / -1' }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, fontFamily: "'Outfit',sans-serif", marginBottom: 16 }}>Email Activity</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {Object.entries(FLOW_LABELS).map(([key, label]) => {
              const count = leads.filter(l => l.lastEmailSent === key).length;
              return (
                <div key={key} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand-gold)', fontFamily: "'Outfit',sans-serif" }}>{count}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Page: Settings ──
  const renderSettings = () => (
    <div style={{ maxWidth: 560 }}>
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, fontFamily: "'Outfit',sans-serif", marginBottom: 4 }}>Admin Credentials</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Changes require a server restart (.env)</div>
        {[
          { key: 'adminEmail', label: 'Admin Email', placeholder: 'admin@company.com', type: 'email' },
          { key: 'adminPassword', label: 'Admin Password', placeholder: '••••••••', type: 'password' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={settingsForm[f.key]} onChange={e => setSettingsForm({ ...settingsForm, [f.key]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, fontFamily: "'Outfit',sans-serif", marginBottom: 4 }}>Email Configuration</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Gmail app password for sending</div>
        {[
          { key: 'gmailUser', label: 'Gmail Address', placeholder: 'your@gmail.com', type: 'email' },
          { key: 'gmailPass', label: 'App Password', placeholder: '••••••••••••••••', type: 'password' },
          { key: 'anaEmail', label: 'Notification Email', placeholder: 'notify@company.com', type: 'email' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={settingsForm[f.key]} onChange={e => setSettingsForm({ ...settingsForm, [f.key]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 28 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, fontFamily: "'Outfit',sans-serif", marginBottom: 16 }}>System Info</div>
        {[
          { label: 'Backend', value: 'http://localhost:3000' },
          { label: 'Frontend', value: 'http://localhost:5173' },
          { label: 'Database', value: 'MongoDB Atlas' },
          { label: 'Socket.io', value: 'Connected ✓' },
          { label: 'Email', value: 'Gmail SMTP' },
          { label: 'Version', value: '1.0.0' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
            <span style={{ color: 'var(--text3)' }}>{r.label}</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{r.value}</span>
          </div>
        ))}
      </div>
      {settingsMsg && <p style={{ marginTop: 12, color: 'var(--green)', fontSize: 13 }}>{settingsMsg}</p>}
    </div>
  );

  return (
    <div style={s.layout}>
      <aside style={s.sidebar}>
        <div style={s.sideAccent} />
        <div style={s.sideTop}>
          <div style={s.logoRow}>
            <div style={s.logoIcon}><span style={s.logoLetter}>O</span></div>
            <div>
              <p style={s.logoText}>OutreachAI</p>
              <p style={s.logoSub}>Email Outreach CRM</p>
            </div>
          </div>
          <div style={s.sideDivider} />
          <nav style={s.nav}>
            {NAV.map(item => (
              <div key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  ...s.navItem,
                  ...(activePage === item.id ? {} : s.navItemMuted),
                  cursor: 'pointer',
                }}>
                <span className="material-symbols-outlined" style={s.navIcon}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </nav>
        </div>
        <div style={s.sideBottom}>
          <div style={s.statusCard}>
            <div style={s.statusDot}>
              <div style={s.greenDot} />
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>System active</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{currentTime}</span>
          </div>
          <button onClick={logout} style={s.logoutBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 6 }}>logout</span>
            Log out
          </button>
        </div>
      </aside>

      <main style={{ ...s.main, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.5s var(--ease)' }}>
        <div style={s.header}>
          <div>
            <h1 style={s.pageTitle}>{PAGE_TITLES[activePage]}</h1>
            <p style={s.pageSub}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>event</span>
              {currentDate}
            </p>
          </div>
          {activePage === 'dashboard' && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={s.addLeadBtn}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showForm ? 'close' : 'person_add'}</span>
              {showForm ? 'Cancel' : 'Add lead'}
            </button>
          )}
          {activePage === 'contacts' && (
            <button className="btn-primary" onClick={() => { setActivePage('dashboard'); setShowForm(true); }} style={s.addLeadBtn}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
              Add lead
            </button>
          )}
        </div>

        {/* Dashboard view */}
        {activePage === 'dashboard' && <>
          <StatsBar stats={stats} />
          {showForm && <div className="card" style={{ marginBottom: 24 }}><AddLeadForm onSuccess={() => { setShowForm(false); refresh(); }} /></div>}
          <div style={s.filterBar}>
            <div style={s.searchWrap}>
              <span className="material-symbols-outlined" style={s.searchIcon}>search</span>
              <input id="search-leads" placeholder="Search name, email, company, industry..." value={search}
                onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40, background: 'var(--bg2)' }} />
            </div>
            <select id="status-filter" value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ width: 180, background: 'var(--bg2)' }}>
              <option value="">All statuses</option>
              <option value="Cold">Cold</option>
              <option value="Engaged">Engaged</option>
              <option value="Micro-Commitment">Micro-Commitment</option>
              <option value="Qualified">Qualified</option>
              <option value="Call Scheduled">Call Scheduled</option>
              <option value="No Interest">No Interest</option>
              <option value="Cold – Re-Engage">Cold – Re-Engage</option>
              <option value="Closed / Lost">Closed / Lost</option>
            </select>
            {(search || statusFilter) && (
              <button className="btn-ghost" onClick={() => { setSearch(''); setStatus(''); }}
                style={{ height: 42, padding: '0 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>filter_alt_off</span> Reset
              </button>
            )}
            <span style={s.count}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-outlined" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }}>sync</span>Loading...</span>
                : <><span className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.5 }}>group</span>{` ${leads.length} Lead${leads.length !== 1 ? 's' : ''}`}</>
              }
            </span>
          </div>
          <LeadsTable leads={leads} onUpdated={refresh} />
        </>}

        {activePage === 'contacts' && renderContacts()}
        {activePage === 'campaigns' && renderCampaigns()}
        {activePage === 'reports' && renderReports()}
        {activePage === 'settings' && renderSettings()}

        <div style={s.footer}>
          <span>© {new Date().getFullYear()} OutreachAI</span>
          <span style={{ margin: '0 8px', opacity: 0.3 }}>·</span>
          <span>AI-powered outreach system</span>
        </div>
      </main>
    </div>
  );
}

const s = {
  layout: { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },
  sidebar: {
    width: 280, flexShrink: 0,
    background: 'linear-gradient(180deg, var(--bg2) 0%, #0c1120 100%)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    padding: '0 0 20px 0', position: 'relative', overflow: 'hidden',
  },
  sideAccent: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg, var(--brand-gold) 0%, transparent 60%)' },
  sideTop: { display: 'flex', flexDirection: 'column', padding: '28px 20px 0' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 4, marginBottom: 6 },
  logoIcon: { width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(145deg, #c9a84c, #a8872f)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(201,168,76,0.25)' },
  logoLetter: { fontSize: 18, fontWeight: 900, color: '#0a0f1a', fontFamily: "'Outfit',sans-serif" },
  logoText: { fontSize: 16, fontWeight: 900, color: 'var(--text)', letterSpacing: '0.08em', fontFamily: "'Outfit',sans-serif" },
  logoSub: { fontSize: 10, color: 'var(--brand-gold)', marginTop: 1, fontWeight: 500, letterSpacing: '0.05em' },
  sideDivider: { height: 1, background: 'linear-gradient(90deg, var(--border-accent), transparent)', margin: '20px 0' },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 10,
    fontSize: 13, fontWeight: 600, color: 'var(--text)',
    background: 'var(--brand-gold-glow)', cursor: 'pointer',
    transition: 'all 0.2s var(--ease)',
    border: '1px solid rgba(201,168,76,0.06)',
    minWidth: '0', // Allow text truncation
    overflow: 'hidden',
  },
  navItemMuted: { background: 'transparent', color: 'var(--text3)', fontWeight: 500, border: '1px solid transparent' },
  navIcon: { fontSize: 20, width: 20, textAlign: 'center', flexShrink: 0 },
  sideBottom: { display: 'flex', flexDirection: 'column', gap: 10, padding: '0 20px' },
  statusCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(62,201,122,0.04)', borderRadius: 8, border: '1px solid rgba(62,201,122,0.08)' },
  statusDot: { display: 'flex', alignItems: 'center', gap: 8 },
  greenDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px rgba(62,201,122,0.5)', animation: 'pulse-gold 2.5s ease infinite' },
  logoutBtn: { background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', transition: 'all 0.2s var(--ease)' },
  main: { flex: 1, padding: '36px 44px', overflowY: 'auto', maxWidth: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  pageTitle: { fontSize: 28, fontWeight: 800, color: 'var(--text)', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.01em' },
  pageSub: { fontSize: 13, color: 'var(--text3)', marginTop: 6, display: 'flex', alignItems: 'center' },
  addLeadBtn: { height: 44, padding: '0 22px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14 },
  filterBar: { display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' },
  searchWrap: { position: 'relative', flex: 1, minWidth: 260 },
  searchIcon: { position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 18, pointerEvents: 'none' },
  count: { marginLeft: 'auto', fontSize: 13, color: 'var(--text3)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 },
  avatar: { width: 34, height: 34, borderRadius: 8, background: 'var(--brand-gold-glow)', color: 'var(--brand-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: "'Outfit',sans-serif", flexShrink: 0, border: '1px solid rgba(201,168,76,0.15)' },
  footer: { marginTop: 44, textAlign: 'center', fontSize: 11, color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: 20, letterSpacing: '0.02em', display: 'flex', justifyContent: 'center', flexWrap: 'wrap' },
};
