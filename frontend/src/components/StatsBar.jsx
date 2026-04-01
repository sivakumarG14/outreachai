import React from 'react';

const STATS = [
  { key: 'total', label: 'Total', icon: 'hub', color: 'var(--brand-gold)', bg: 'var(--brand-gold-glow)' },
  { key: 'cold', label: 'Cold', icon: 'ac_unit', color: '#94a3b8', bg: 'rgba(148,163,184,0.07)' },
  { key: 'engaged', label: 'Engaged', icon: 'forum', color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
  { key: 'microCommitment', label: 'Micro-Commit', icon: 'check_circle', color: 'var(--purple)', bg: 'var(--purple-bg)' },
  { key: 'callScheduled', label: 'Call Schd', icon: 'event', color: 'var(--green)', bg: 'var(--green-bg)' },
  { key: 'noInterest', label: 'No Interest', icon: 'block', color: 'var(--red)', bg: 'var(--red-bg)' },
  { key: 'highPriority', label: 'Priority', icon: 'local_fire_department', color: 'var(--orange)', bg: 'var(--orange-bg)' },
];

export default function StatsBar({ stats }) {
  return (
    <div style={s.grid}>
      {STATS.map((item, i) => (
        <div
          key={item.key}
          style={{
            ...s.card,
            animationDelay: `${i * 0.06}s`,
          }}
        >
          <div style={{ ...s.iconWrap, background: item.bg, color: item.color }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
          </div>
          <div>
            <p style={{ ...s.value, color: item.color }}>{stats[item.key] ?? 0}</p>
            <p style={s.label}>{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const s = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 14,
    marginBottom: 28,
  },
  card: {
    background: 'linear-gradient(145deg, var(--bg2) 0%, var(--bg3) 100%)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '18px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    transition: 'all 0.3s var(--ease)',
    animation: 'fadeIn 0.4s var(--ease) both',
    cursor: 'default',
    minWidth: '0', // Allow content to shrink
  },
  iconWrap: {
    width: 42, height: 42,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'transform 0.3s var(--ease)',
  },
  value: {
    fontSize: 26,
    fontWeight: 800,
    lineHeight: 1,
    fontFamily: "'Outfit', sans-serif",
  },
  label: {
    fontSize: 11,
    color: 'var(--text2)',
    marginTop: 4,
    fontWeight: 500,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
