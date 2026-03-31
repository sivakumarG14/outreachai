import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/login', form);
      localStorage.setItem('token', data.token);
      navigate('/');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Ambient gold glows */}
      <div style={s.glow1} />
      <div style={s.glow2} />
      <div style={s.glow3} />

      {/* Decorative grid lines */}
      <div style={s.gridOverlay} />

      <div style={{
        ...s.card,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
      }}>
        {/* Gold accent line on top */}
        <div style={s.accentLine} />

        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoIcon}>
            <span style={s.logoLetter}>O</span>
          </div>
          <div>
            <h1 style={s.logo}>OutreachAI</h1>
            <p style={s.logoSub}>Email Outreach CRM</p>
          </div>
        </div>

        <div style={s.divider} />

        <div>
          <h2 style={s.title}>Welcome back</h2>
          <p style={s.subtitle}>Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>
              <span className="material-symbols-outlined" style={s.labelIcon}>mail</span>
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@company.com"
              autoComplete="email"
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>
              <span className="material-symbols-outlined" style={s.labelIcon}>lock</span>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="error-msg" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
              {error}
            </p>
          )}

          <button
            id="login-submit"
            className="btn-primary"
            type="submit"
            disabled={loading}
            style={s.submitBtn}
          >
            {loading ? (
              <span style={s.loadingWrap}>
                <span style={s.spinner} />
                Signing in...
              </span>
            ) : (
              <>Sign in</>
            )}
          </button>
        </form>

        <p style={s.footer}>
          © {new Date().getFullYear()} OutreachAI · AI-Powered Outreach
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(201,168,76,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(201,168,76,0.02) 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
    pointerEvents: 'none',
  },
  glow1: {
    position: 'absolute', top: '-25%', left: '-15%',
    width: 700, height: 700,
    background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 65%)',
    pointerEvents: 'none',
    filter: 'blur(40px)',
  },
  glow2: {
    position: 'absolute', bottom: '-30%', right: '-10%',
    width: 600, height: 600,
    background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 65%)',
    pointerEvents: 'none',
    filter: 'blur(40px)',
  },
  glow3: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400, height: 400,
    background: 'radial-gradient(circle, rgba(201,168,76,0.03) 0%, transparent 70%)',
    pointerEvents: 'none',
    filter: 'blur(60px)',
  },
  card: {
    width: '100%', maxWidth: 440,
    background: 'linear-gradient(160deg, #0f1526 0%, #131b2f 50%, #0f1526 100%)',
    border: '1px solid rgba(201,168,76,0.1)',
    borderRadius: 20,
    padding: '44px 40px 36px',
    boxShadow: '0 12px 64px rgba(0,0,0,0.5), 0 0 80px rgba(201,168,76,0.04)',
    position: 'relative', zIndex: 1,
    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute', top: 0, left: '10%', right: '10%',
    height: 2,
    background: 'linear-gradient(90deg, transparent 0%, var(--brand-gold) 50%, transparent 100%)',
    borderRadius: 2,
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28,
  },
  logoIcon: {
    width: 48, height: 48, borderRadius: 12,
    background: 'linear-gradient(145deg, #c9a84c, #a8872f)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(201,168,76,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    position: 'relative',
  },
  logoLetter: {
    fontSize: 22, fontWeight: 900, color: '#0a0f1a',
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '-0.02em',
  },
  logo: {
    fontSize: 22, fontWeight: 900, color: 'var(--text)',
    letterSpacing: '0.08em',
    fontFamily: "'Outfit', sans-serif",
  },
  logoSub: {
    fontSize: 11, color: 'var(--brand-gold)',
    marginTop: 1, fontWeight: 500,
    letterSpacing: '0.06em',
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.12), transparent)',
    marginBottom: 28,
  },
  title: {
    fontSize: 24, fontWeight: 700, color: 'var(--text)',
    marginBottom: 6,
    fontFamily: "'Outfit', sans-serif",
  },
  subtitle: {
    fontSize: 14, color: 'var(--text2)', marginBottom: 28,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: {
    fontSize: 12, fontWeight: 600, color: 'var(--text2)',
    display: 'flex', alignItems: 'center', gap: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  labelIcon: { fontSize: 15, color: 'var(--brand-gold)', opacity: 0.7 },
  submitBtn: {
    width: '100%', padding: '13px', fontSize: 14,
    marginTop: 6, borderRadius: 10,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  loadingWrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  spinner: {
    width: 16, height: 16, borderRadius: '50%',
    border: '2px solid rgba(10,15,26,0.2)',
    borderTopColor: '#0a0f1a',
    animation: 'spin 0.6s linear infinite',
  },
  footer: {
    textAlign: 'center', fontSize: 11, color: 'var(--text3)',
    marginTop: 32,
    letterSpacing: '0.02em',
  },
};

// Inject spinner animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}
