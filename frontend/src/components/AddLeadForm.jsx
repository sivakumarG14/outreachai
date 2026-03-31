import React, { useState } from 'react';
import api from '../api';

const EMPTY = { name: '', email: '', company: '', industry: '', notes: '' };

const FIELDS = [
  { name: 'name',     label: 'Contact Name',   placeholder: 'John Smith',        icon: 'person',      required: true },
  { name: 'email',    label: 'Email Address',   placeholder: 'john@company.com',  icon: 'mail',        required: true, type: 'email' },
  { name: 'company',  label: 'Company Name',    placeholder: 'Acme Inc.',         icon: 'business',    required: true },
  { name: 'industry', label: 'Industry',        placeholder: 'SaaS / Technology', icon: 'category',    required: true },
];

export default function AddLeadForm({ onSuccess }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await api.post('/add-lead', form);
      setSuccess('Lead added. Cold outreach email has been sent automatically.');
      setForm(EMPTY);
      setTimeout(onSuccess, 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ animation: 'scaleIn 0.3s var(--ease) both' }}>
      <div style={s.header}>
        <div style={s.headerIcon}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--brand-gold)' }}>person_add</span>
        </div>
        <div>
          <h3 style={s.title}>Add New Lead</h3>
          <p style={s.sub}>Cold outreach email (Flow 1) will be sent automatically</p>
        </div>
      </div>

      <div style={s.grid}>
        {FIELDS.map((f) => (
          <div key={f.name} style={s.field}>
            <label style={s.label}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.6 }}>{f.icon}</span>
              {f.label}
            </label>
            <input
              id={`add-lead-${f.name}`}
              name={f.name}
              type={f.type || 'text'}
              placeholder={f.placeholder}
              required={f.required}
              value={form[f.name]}
              onChange={handleChange}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={s.field}>
          <label style={s.label}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.6 }}>edit_note</span>
            Notes (optional)
          </label>
          <input name="notes" placeholder="Additional notes..." value={form.notes} onChange={handleChange} />
        </div>
      </div>

      {error && (
        <p className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>error</span>{error}
        </p>
      )}
      {success && (
        <p className="success-msg" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>{success}
        </p>
      )}

      <div style={{ marginTop: 20 }}>
        <button id="add-lead-submit" className="btn-primary" type="submit" disabled={loading}
          style={{ padding: '11px 28px', fontSize: 13, borderRadius: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {loading ? 'sync' : 'rocket_launch'}
            </span>
            {loading ? 'Adding...' : 'Add Lead → Start Funnel'}
          </span>
        </button>
      </div>
    </form>
  );
}

const s = {
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' },
  headerIcon: { width: 40, height: 40, borderRadius: 10, background: 'var(--brand-gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: "'Outfit', sans-serif" },
  sub: { fontSize: 12, color: 'var(--text2)', marginTop: 2 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
};
