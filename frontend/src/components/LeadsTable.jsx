import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';

const STATUS_STYLE = {
  'Cold': { color: '#8895a7', bg: 'rgba(136,149,167,0.1)', icon: 'ac_unit' },
  'Engaged': { color: '#e8b84a', bg: 'rgba(232,184,74,0.1)', icon: 'forum' },
  'Micro-Commitment': { color: '#9a6ef5', bg: 'rgba(154,110,245,0.1)', icon: 'verified' },
  'Qualified': { color: '#3ec97a', bg: 'rgba(62,201,122,0.1)', icon: 'star' },
  'Call Scheduled': { color: '#40c4c4', bg: 'rgba(64,196,196,0.1)', icon: 'event' },
  'No Interest': { color: '#e85454', bg: 'rgba(232,84,84,0.1)', icon: 'block' },
  'Cold – Re-Engage': { color: '#e89040', bg: 'rgba(232,144,64,0.1)', icon: 'replay' },
  'Closed / Lost': { color: '#5a5347', bg: 'rgba(90,83,71,0.1)', icon: 'cancel' },
};

const EDIT_FIELDS = [
  { key: 'name',     label: 'Contact Name', icon: 'person',      type: 'text' },
  { key: 'email',    label: 'Email',        icon: 'mail',        type: 'email' },
  { key: 'company',  label: 'Company',      icon: 'business',    type: 'text' },
  { key: 'industry', label: 'Industry',     icon: 'category',    type: 'text' },
  { key: 'score',    label: 'Score',        icon: 'analytics',   type: 'number' },
  { key: 'notes',    label: 'Notes',        icon: 'edit_note',   type: 'text' },
];

const REPLY_TYPES = [
  { value: 'yes', label: 'Yes / Interested' },
  { value: 'no', label: 'No / Not interested' },
  { value: 'address', label: 'Address sent' },
  { value: 'question', label: 'Question asked' },
  { value: 'later', label: 'Maybe later' },
];

export default function LeadsTable({ leads, onUpdated }) {
  const [editModal, setEditModal]   = useState(null);
  const [editData, setEditData]     = useState({});
  const [saving, setSaving]         = useState(false);
  const [replyModal, setReplyModal] = useState(null);
  const [replyType, setReplyType]   = useState('yes');
  const [deleting, setDeleting]     = useState(null);
  const [callModal, setCallModal]   = useState(null);
  const [callDate, setCallDate]     = useState('');

  const openEdit = (lead) => {
    setEditModal(lead);
    setEditData({
      name: lead.name || '',
      email: lead.email || '',
      company: lead.company || '',
      industry: lead.industry || '',
      status: lead.status || 'Cold',
      score: lead.score ?? 0,
      notes: lead.notes || '',
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.post('/update-lead', { leadId: editModal._id, ...editData });
      setEditModal(null);
      onUpdated();
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReply = async () => {
    try {
      await api.post('/funnel/reply', { leadId: replyModal, replyType });
      setReplyModal(null); onUpdated();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleLinkClick = async (leadId) => {
    try { await api.post('/funnel/link-click', { leadId }); onUpdated(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleScheduleCall = async () => {
    try {
      await api.post('/funnel/schedule-call', { leadId: callModal, callDate });
      setCallModal(null); onUpdated();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleNotifyAna = async (leadId) => {
    try {
      await api.post('/funnel/notify-ana', { leadId, message: 'Manual notification from CRM Dashboard' });
      alert('Notification sent!');
    } catch { alert('Failed to send notification'); }
  };

  const handleDelete = async (lead) => {
    if (!window.confirm(`Delete "${lead.name}"?`)) return;
    setDeleting(lead._id);
    try { await api.delete(`/delete-lead/${lead._id}`); onUpdated(); }
    catch (err) { alert(err.response?.data?.error || 'Delete failed'); }
    finally { setDeleting(null); }
  };

  if (!leads.length) return (
    <div style={s.empty}>
      <div style={s.emptyIcon}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--brand-gold)', opacity: 0.4 }}>inbox</span>
      </div>
      <p style={{ color: 'var(--text2)', fontWeight: 600, fontSize: 15, fontFamily: "'Outfit',sans-serif" }}>No leads yet</p>
      <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 6 }}>Add your first lead to start the funnel</p>
    </div>
  );

  return (
    <>
      {/* ── Edit Modal ── */}
      {editModal && createPortal(
        <div style={s.overlay} onClick={() => setEditModal(null)}>
          <div style={{ ...s.modal, minWidth: 480, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span className="material-symbols-outlined" style={{ color: 'var(--brand-gold)', fontSize: 22 }}>edit</span>
              <h3 style={s.modalTitle}>Edit lead</h3>
            </div>
            <div style={s.modalDivider} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {EDIT_FIELDS.map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={s.fieldLabel}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, opacity: 0.6 }}>{f.icon}</span>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={editData[f.key]}
                    onChange={e => setEditData({ ...editData, [f.key]: e.target.value })}
                    style={{ padding: '9px 12px', fontSize: 13 }}
                  />
                </div>
              ))}
            </div>

            {/* Status full width */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={s.fieldLabel}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, opacity: 0.6 }}>info</span>
                  Status
                </label>
                <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })}
                  style={{ padding: '9px 12px', fontSize: 13 }}>
                  {Object.keys(STATUS_STYLE).map(st => <option key={st}>{st}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={saveEdit} disabled={saving}
                style={{ flex: 1, borderRadius: 10, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{saving ? 'sync' : 'save'}</span>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button className="btn-ghost" onClick={() => setEditModal(null)} style={{ borderRadius: 10, padding: '11px 18px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Reply Modal ── */}
      {replyModal && createPortal(
        <div style={s.overlay} onClick={() => setReplyModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span className="material-symbols-outlined" style={{ color: 'var(--brand-gold)', fontSize: 22 }}>reply</span>
              <h3 style={s.modalTitle}>Mark reply</h3>
            </div>
            <div style={s.modalDivider} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {REPLY_TYPES.map(r => (
                <div key={r.value} onClick={() => setReplyType(r.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${replyType === r.value ? 'var(--brand-gold)' : 'var(--border)'}`,
                    background: replyType === r.value ? 'var(--brand-gold-glow)' : 'var(--bg3)',
                    transition: 'all 0.15s var(--ease)',
                  }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${replyType === r.value ? 'var(--brand-gold)' : 'var(--text3)'}`,
                    background: replyType === r.value ? 'var(--brand-gold)' : 'transparent',
                    transition: 'all 0.15s var(--ease)',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: replyType === r.value ? 600 : 400, color: replyType === r.value ? 'var(--text)' : 'var(--text2)' }}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={handleReply} style={{ flex: 1, borderRadius: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>Process
                </span>
              </button>
              <button className="btn-ghost" onClick={() => setReplyModal(null)} style={{ borderRadius: 10 }}>Cancel</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Schedule Call Modal ── */}
      {callModal && createPortal(
        <div style={s.overlay} onClick={() => setCallModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span className="material-symbols-outlined" style={{ color: 'var(--brand-gold)', fontSize: 22 }}>event</span>
              <h3 style={s.modalTitle}>Schedule call</h3>
            </div>
            <div style={s.modalDivider} />
            <input type="datetime-local" value={callDate} onChange={e => setCallDate(e.target.value)} style={{ marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={handleScheduleCall} style={{ flex: 1, borderRadius: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>event_available</span>Schedule
                </span>
              </button>
              <button className="btn-ghost" onClick={() => setCallModal(null)} style={{ borderRadius: 10 }}>Cancel</button>
            </div>
          </div>
        </div>
      , document.body)}

      <div style={s.tableWrap}>
        {/* Table header bar */}
        <div style={s.tableHeader}>
          <div style={s.tableHeaderLeft}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--brand-gold)' }}>group</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'Outfit',sans-serif" }}>
              All contacts
            </span>
            <span style={{
              background: 'var(--brand-gold-glow)', color: 'var(--brand-gold)',
              fontSize: 11, fontWeight: 700, padding: '2px 10px',
              borderRadius: 20, border: '1px solid rgba(201,168,76,0.15)',
              fontFamily: "'Outfit',sans-serif",
            }}>
              {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>update</span>
            Live
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px rgba(62,201,122,0.5)', display: 'inline-block' }} />
          </span>
        </div>

        {/* Scrollable table body */}
        <div style={s.tableScroll} className="table-scroll">
          <table style={s.table}>
            <thead>
            <tr>
              {[
                { label: 'Lead', icon: 'person' }, { label: 'Company', icon: 'business' },
                { label: 'Status', icon: 'info' }, { label: 'Flow', icon: 'route' },
                { label: 'Score', icon: 'analytics' }, { label: 'Last email', icon: 'mail' },
                { label: 'Actions', icon: 'settings' },
              ].map(h => (
                <th key={h.label} style={s.th}>
                  <span style={s.thContent}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.5 }}>{h.icon}</span>
                    {h.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => {
              const st = STATUS_STYLE[lead.status] || STATUS_STYLE['Cold'];
              const isHighPriority = lead.score >= 40;
              return (
                <tr key={lead._id} style={{ ...s.row, background: isHighPriority ? 'rgba(232,144,64,0.03)' : 'transparent', animation: `fadeIn 0.3s var(--ease) ${i * 0.03}s both` }}>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isHighPriority && (
                        <span className="material-symbols-outlined" title="High priority"
                          style={{ color: 'var(--orange)', fontSize: 18, animation: 'pulse-gold 2s ease infinite' }}>
                          local_fire_department
                        </span>
                      )}
                      <div style={s.avatar}>{lead.name?.charAt(0)?.toUpperCase()}</div>
                      <div>
                        <div style={s.leadName}>{lead.name}</div>
                        <div style={s.leadEmail}>{lead.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={s.companyTag}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>business</span>{lead.company}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>category</span>{lead.industry}
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: st.bg, color: st.color, border: `1px solid ${st.bg}` }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{st.icon}</span>
                      {lead.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={s.flowBadge}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--brand-gold)' }}>route</span>
                      Flow {lead.flow || 1}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.scoreBadge, color: lead.score >= 40 ? 'var(--orange)' : 'var(--text2)', background: lead.score >= 40 ? 'var(--orange-bg)' : 'transparent' }}>
                      {lead.score || 0}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12, opacity: 0.5 }}>mail</span>
                        {lead.lastEmailSent || '—'}
                      </div>
                      {lead.lastEmailDate && (
                        <div style={{ opacity: 0.7 }}>{new Date(lead.lastEmailDate).toLocaleDateString('en-GB')}</div>
                      )}
                    </div>
                  </td>
                  <td style={{ ...s.td, minWidth: 260 }}>
                    <div style={s.actions}>
                      <button className="btn-success" onClick={() => setReplyModal(lead._id)} style={s.actionBtn} title="Mark reply">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>reply</span>
                      </button>
                      <button className="btn-ghost" onClick={() => { setCallModal(lead._id); setCallDate(''); }} style={s.actionBtn} title="Schedule call">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event</span>
                      </button>
                      <button className="btn-ghost" onClick={() => handleLinkClick(lead._id)} style={s.actionBtn} title="Track link click">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link</span>
                      </button>
                      <button className="btn-ghost" onClick={() => handleNotifyAna(lead._id)} style={s.actionBtn} title="Send notification">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>notifications</span>
                      </button>
                      <button className="btn-ghost" onClick={() => openEdit(lead)} style={s.actionBtn} title="Edit">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                      </button>
                      <button className="btn-danger" onClick={() => handleDelete(lead)} disabled={deleting === lead._id} style={s.actionBtn} title="Delete">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>{/* end tableScroll */}
      </div>
    </>
  );
}

const s = {
  tableWrap: {
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  tableHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'linear-gradient(180deg, var(--bg3) 0%, var(--bg2) 100%)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  tableHeaderLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  tableScroll: {
    overflowY: 'auto',
    overflowX: 'auto',
    maxHeight: '520px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(201,168,76,0.2) transparent',
  },
  table: { width: '100%', borderCollapse: 'collapse', background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)' },
  th: {
    padding: '13px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em',
    background: 'var(--bg2)',
    borderBottom: '1px solid var(--border)',
    fontFamily: "'Outfit',sans-serif",
    position: 'sticky', top: 0, zIndex: 1,
  },
  thContent: { display: 'flex', alignItems: 'center', gap: 6 },
  row: { borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s var(--ease)' },
  td: { padding: '14px 16px', fontSize: 13, verticalAlign: 'middle' },
  avatar: { width: 34, height: 34, borderRadius: 8, background: 'var(--brand-gold-glow)', color: 'var(--brand-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: "'Outfit',sans-serif", flexShrink: 0, border: '1px solid rgba(201,168,76,0.15)' },
  leadName: { fontWeight: 600, color: 'var(--text)', fontSize: 14, fontFamily: "'Outfit',sans-serif" },
  leadEmail: { color: 'var(--text3)', fontSize: 12, marginTop: 1 },
  companyTag: { background: 'var(--brand-gold-glow)', color: 'var(--brand-gold-light)', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid rgba(201,168,76,0.08)' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  flowBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)', fontWeight: 600 },
  scoreBadge: { fontSize: 15, fontWeight: 800, fontFamily: "'Outfit',sans-serif", padding: '3px 10px', borderRadius: 8 },
  actions: { display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' },
  actionBtn: { padding: '6px 8px', fontSize: 11, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, height: 32 },
  empty: { background: 'linear-gradient(145deg, var(--bg2) 0%, var(--bg3) 100%)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '60px 20px', textAlign: 'center', animation: 'fadeIn 0.4s var(--ease) both' },
  emptyIcon: { width: 72, height: 72, borderRadius: 16, background: 'var(--brand-gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(201,168,76,0.1)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s var(--ease) both' },
  modal: { background: 'linear-gradient(160deg, var(--bg2) 0%, var(--bg3) 100%)', border: '1px solid var(--border-accent)', borderRadius: 16, padding: 32, minWidth: 360, display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', animation: 'scaleIn 0.25s var(--ease) both' },
  modalHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  modalTitle: { color: 'var(--text)', fontSize: 18, fontWeight: 700, fontFamily: "'Outfit',sans-serif" },
  modalDivider: { height: 1, background: 'linear-gradient(90deg, var(--border-accent), transparent)', margin: '14px 0 20px' },
  fieldLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 },
};
