import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, X, BookOpen, BarChart2, MessageCircle, Eye, Layers, ChevronDown } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   STYLE OVERRIDE
   Defeats the app's index.css !important rules on h1-h6, p, label, tr:hover.
   [data-lp] has specificity (0,1,1) which beats plain tag (0,0,1) even with !important.
───────────────────────────────────────────────────────────────────────────── */
const STYLE_OVERRIDE = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Space+Grotesk:wght@500;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
  [data-lp] h1,[data-lp] h2,[data-lp] h3,[data-lp] h4,[data-lp] h5,[data-lp] h6 { color: inherit !important; font-family: 'Manrope', sans-serif !important; }
  [data-lp] nav a, [data-lp] nav button, [data-lp] header a, [data-lp] header button, [data-lp] header span { font-family: 'Manrope', sans-serif !important; }
  [data-lp] p,[data-lp] label { color: inherit !important; }
  [data-lp] tr:hover { background-color: transparent !important; }
  [data-lp] * { box-sizing: border-box; }
  [data-lp] a { text-decoration: none; }
  [data-lp] button { font-family: inherit; }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS — all hardcoded, zero app CSS vars
───────────────────────────────────────────────────────────────────────────── */
const T = {
  grad:      'linear-gradient(135deg, #6366f1 0%, #a855f7 55%, #d946ef 100%)',
  gradBtn:   'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  gradText:  { background: 'linear-gradient(135deg, #6366f1, #a855f7, #d946ef)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const },
  darkBg:    '#07070f',
  darkCard:  '#10101e',
  darkBdr:   'rgba(255,255,255,0.08)',
  lightBg:   '#ffffff',
  altBg:     '#f8faff',
  win:       '#008F67',
  loss:      '#DF1C30',
  indigo:    '#6366f1',
  violet:    '#a855f7',
  fuchsia:   '#d946ef',
  text:      '#0f172a',
  textSub:   '#64748b',
  textMuted: '#94a3b8',
  ff:        "'Inter', system-ui, sans-serif",
  ffDisplay: "'Manrope', system-ui, sans-serif",
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
   GRADIENT TEXT helper
───────────────────────────────────────────────────────────────────────────── */
const G: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={T.gradText}>{children}</span>
);

/* ─────────────────────────────────────────────────────────────────────────────
   TILT CARD — 3D perspective tilt on hover, CSS transition handles smoothing
───────────────────────────────────────────────────────────────────────────── */
interface TiltCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  maxAngle?: number;
}
const TiltCard: React.FC<TiltCardProps> = ({ children, style = {}, maxAngle = 7 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setTilt({
        x: ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * maxAngle,
        y: ((r.left + r.width / 2 - e.clientX) / (r.width / 2)) * maxAngle,
      });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, [maxAngle]);

  return (
    <div ref={ref} style={{ ...style, transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: 'transform 0.18s ease', willChange: 'transform' }}>
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   REVEAL — scroll-triggered fade/slide via IntersectionObserver
───────────────────────────────────────────────────────────────────────────── */
interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  from?: 'up' | 'left' | 'right';
  style?: React.CSSProperties;
}
const Reveal: React.FC<RevealProps> = ({ children, delay = 0, from = 'up', style = {} }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const hidden = { up: 'translateY(36px)', left: 'translateX(-36px)', right: 'translateX(36px)' }[from];
  return (
    <div ref={ref} style={{ ...style, opacity: vis ? 1 : 0, transform: vis ? 'translate(0,0)' : hidden, transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`, willChange: 'opacity, transform' }}>
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAGNETIC BUTTON — subtly pulls toward cursor when nearby
───────────────────────────────────────────────────────────────────────────── */
interface MagBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  radius?: number;
  strength?: number;
}
const MagBtn: React.FC<MagBtnProps> = ({ children, onClick, style = {}, radius = 90, strength = 0.28 }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [off, setOff] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        const f = (1 - dist / radius) * strength;
        setOff({ x: dx * f, y: dy * f });
      } else {
        setOff({ x: 0, y: 0 });
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [radius, strength]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{ ...style, transform: `translate(${off.x}px,${off.y}px)`, transition: 'transform 0.25s ease', cursor: 'pointer' }}
    >
      {children}
    </button>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   COUNT UP — counts from 0 to target when scrolled into view
───────────────────────────────────────────────────────────────────────────── */
const CountUp: React.FC<{ to: number; prefix?: string; suffix?: string; duration?: number }> = ({ to, prefix = '', suffix = '', duration = 1800 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let t0 = 0;
        const step = (ts: number) => {
          if (!t0) t0 = ts;
          const p = Math.min((ts - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.floor(eased * to));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
};

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT MOCKUP COMPONENTS
   All rendered via inline JSX — no images, no placeholders
═══════════════════════════════════════════════════════════════════════════ */

/* ── Dashboard Mockup (Hero) ────────────────────────────────────────────── */
const DashMockup: React.FC = () => (
  <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 32px 100px rgba(99,102,241,0.13), 0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden', fontFamily: T.ff }}>
    {/* Titlebar */}
    <div style={{ background: '#fafafa', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {['#fecaca','#fed7aa','#bbf7d0'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
      </div>
      <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8', letterSpacing: '0.04em' }}>TRADELYZE · DASHBOARD · Q2 2026</span>
      <span style={{ fontSize: 10, fontWeight: 700, background: T.gradBtn, color: '#fff', padding: '2px 9px', borderRadius: 8 }}>Score 84%</span>
    </div>
    {/* KPI cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, padding: '14px 18px' }}>
      {[
        { l: 'Net P&L', v: '₹48,200', c: T.win },
        { l: 'Trades', v: '127', c: T.text },
        { l: 'Win Rate', v: '71%', c: T.indigo },
        { l: 'Profit Factor', v: '2.8×', c: T.violet },
        { l: 'Avg R', v: '+1.6R', c: T.indigo },
      ].map(k => (
        <div key={k.l} style={{ background: T.altBg, borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)', padding: '10px 12px' }}>
          <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.textMuted, marginBottom: 4 }}>{k.l}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: k.c, fontVariantNumeric: 'tabular-nums' }}>{k.v}</div>
        </div>
      ))}
    </div>
    {/* Equity curve */}
    <div style={{ padding: '0 18px 14px' }}>
      <div style={{ background: T.altBg, borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', padding: '12px', position: 'relative' }}>
        <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.textMuted, marginBottom: 8 }}>Equity Curve Reconstruction</div>
        <svg width="100%" height="80" viewBox="0 0 500 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id="eqg1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.win} stopOpacity="0.2" />
              <stop offset="100%" stopColor={T.win} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 72 C20 70 40 65 70 58 S110 52 140 44 S175 48 205 38 S240 26 270 18 S305 22 335 14 S375 9 410 5 S460 3 500 2 L500 80 L0 80Z" fill="url(#eqg1)" />
          <path d="M0 72 C20 70 40 65 70 58 S110 52 140 44 S175 48 205 38 S240 26 270 18 S305 22 335 14 S375 9 410 5 S460 3 500 2" fill="none" stroke={T.win} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="500" cy="2" r="5" fill={T.win} />
        </svg>
      </div>
    </div>
    {/* Score bars */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '0 18px 16px' }}>
      {[{ l: 'Psychology', v: 88, c: T.indigo }, { l: 'Technical', v: 74, c: T.win }, { l: 'Risk Mgmt', v: 91, c: T.violet }].map(m => (
        <div key={m.l} style={{ background: T.altBg, borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.textMuted }}>{m.l}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: m.c }}>{m.v}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2 }}>
            <div style={{ width: `${m.v}%`, height: '100%', background: m.c, borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ── Journal Mockup ──────────────────────────────────────────────────────── */
const JournalMockup: React.FC = () => {
  const rows = [
    { t: '09:23', sym: 'NIFTY50', dir: 'LONG', setup: 'OB + FVG', pnl: '+₹2,840', r: '+1.4R', w: true },
    { t: '10:47', sym: 'BANKNIFTY', dir: 'LONG', setup: 'CHoCH + MSS', pnl: '+₹3,640', r: '+1.8R', w: true },
    { t: '13:15', sym: 'NIFTY50', dir: 'SHORT', setup: 'Liq. Sweep', pnl: '+₹1,900', r: '+0.9R', w: true },
    { t: '14:02', sym: 'BANKNIFTY', dir: 'SHORT', setup: 'OB Rejection', pnl: '-₹1,200', r: '-0.6R', w: false },
  ];
  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 32px 100px rgba(99,102,241,0.13)', overflow: 'hidden', fontFamily: T.ff }}>
      <div style={{ background: '#fafafa', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Daily Journal · July 22, 2026</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.win }}>Net P&L: +₹7,180</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: T.altBg }}>
            {['Time','Symbol','Dir','Setup','P&L','R'].map(h => (
              <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.textMuted, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{r.t}</td>
              <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: T.text }}>{r.sym}</td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{ background: r.dir === 'LONG' ? T.win : T.loss, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>{r.dir}</span>
              </td>
              <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748b' }}>{r.setup}</td>
              <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: r.w ? T.win : T.loss, fontFamily: 'monospace' }}>{r.pnl}</td>
              <td style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: r.w ? T.win : T.loss, fontFamily: 'monospace' }}>{r.r}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.textMuted, flexShrink: 0 }}>Psychology</span>
        {[{l:'Discipline',v:90,c:T.indigo},{l:'Patience',v:75,c:T.violet},{l:'Risk Ctrl',v:85,c:T.win}].map(p => (
          <div key={p.l} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2 }}>
              <div style={{ width: `${p.v}%`, height: '100%', background: p.c, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: p.c, minWidth: 24 }}>{p.v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Reports Mockup (dark) ───────────────────────────────────────────────── */
const ReportsMockup: React.FC = () => {
  const bars = [18,22,15,28,35,12,42,38,45,22,31,48];
  const mths = 'JFMAMJJASOND'.split('');
  const mx = Math.max(...bars);
  return (
    <div style={{ background: T.darkCard, borderRadius: 18, border: `1px solid ${T.darkBdr}`, boxShadow: '0 32px 100px rgba(0,0,0,0.5)', overflow: 'hidden', fontFamily: T.ff }}>
      <div style={{ borderBottom: `1px solid ${T.darkBdr}`, padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>Annual Performance · 2026</span>
        <span style={{ fontSize: 10, color: T.textMuted }}>12-month view</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: `1px solid ${T.darkBdr}` }}>
        {[{l:'Total P&L',v:'₹3.56L',c:T.win},{l:'Win Rate',v:'68%',c:T.violet},{l:'Profit Factor',v:'3.1×',c:T.indigo},{l:'Best Month',v:'₹48K',c:'#f59e0b'}].map(k => (
          <div key={k.l} style={{ padding: '12px 14px', borderRight: `1px solid ${T.darkBdr}` }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#334155', marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>
      {/* Bar chart */}
      <div style={{ padding: '16px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 90 }}>
          {bars.map((v,i) => {
            const h = Math.round((v/mx)*78);
            const hot = v === mx;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: h, background: hot ? T.gradBtn : 'rgba(99,102,241,0.25)', borderRadius: '4px 4px 0 0' }} />
                <span style={{ fontSize: 7, color: '#334155', fontWeight: 600 }}>{mths[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Mistakes */}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ borderRadius: 12, border: `1px solid ${T.darkBdr}`, padding: '12px 14px' }}>
          <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#334155', marginBottom: 10 }}>Top Mistake Patterns</div>
          {[{m:'Early entry before confirmation',p:32,c:T.loss},{m:'Overtrading after losses',p:21,c:'#f59e0b'},{m:'Tight stop on volatility',p:15,c:'#f59e0b'}].map(e => (
            <div key={e.m} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: T.textMuted }}>{e.m}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: e.c }}>{e.p}%</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ width: `${e.p}%`, height: '100%', background: e.c, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Strategy Mockup ─────────────────────────────────────────────────────── */
const StrategyMockup: React.FC = () => {
  const rules = [
    { t: 'HTF Bias confirmed on 4H OB', done: true },
    { t: 'Price within Kill Zone (London/NY)', done: true },
    { t: 'CHoCH or MSS on 15m confirmed', done: true },
    { t: 'FVG entry on 1m retracement', done: true },
    { t: 'SL below last swing low / above high', done: false },
    { t: 'Minimum 2R target projected clear', done: false },
  ];
  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 32px 100px rgba(99,102,241,0.13)', overflow: 'hidden', fontFamily: T.ff }}>
      <div style={{ background: T.gradBtn, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Strategy Playbook</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: T.ffDisplay }}>ICT London OB Setup</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>Win Rate</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', fontFamily: T.ffDisplay }}>74%</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {[{l:'Trades',v:'48'},{l:'Avg R',v:'+1.9R'},{l:'PF',v:'2.6×'}].map(s => (
            <div key={s.l} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{s.l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.textMuted, marginBottom: 10 }}>Entry Checklist</div>
        {rules.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < rules.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: r.done ? T.win : 'transparent', border: r.done ? 'none' : '2px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {r.done && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>}
            </div>
            <span style={{ fontSize: 12, color: r.done ? T.text : T.textMuted }}>{r.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Visual Match Mockup (dark) ──────────────────────────────────────────── */
const VisualMockup: React.FC = () => {
  const matches = [
    { sim: 94, r: '+1.6R', w: true, path: 'M0 22 C10 18 22 12 34 7 S46 4 50 2' },
    { sim: 89, r: '+1.4R', w: true, path: 'M0 24 C8 20 18 14 28 9 S40 5 50 2' },
    { sim: 84, r: '+2.0R', w: true, path: 'M0 20 C12 16 24 10 34 6 S44 2 50 1' },
    { sim: 79, r: '-0.6R', w: false, path: 'M0 16 C10 18 20 22 30 20 S42 24 50 22' },
    { sim: 76, r: '+0.9R', w: true, path: 'M0 22 C10 18 20 13 32 8 S43 5 50 3' },
    { sim: 71, r: '+1.1R', w: true, path: 'M0 24 C10 20 22 15 32 10 S43 6 50 3' },
  ];
  return (
    <div style={{ background: T.darkCard, borderRadius: 18, border: `1px solid ${T.darkBdr}`, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', overflow: 'hidden', fontFamily: T.ff }}>
      <div style={{ borderBottom: `1px solid ${T.darkBdr}`, padding: '10px 18px' }}>
        <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.indigo, marginBottom: 6 }}>Current Chart Pattern · Scanning...</div>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', height: 62, position: 'relative' }}>
          <svg width="100%" height="42" viewBox="0 0 220 42" preserveAspectRatio="none">
            <path d="M0 38 C20 35 40 28 65 20 S100 12 125 8 S160 5 185 3 S205 2 220 1" fill="none" stroke={T.indigo} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="220" cy="1" r="4" fill={T.violet} />
          </svg>
          <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 8, fontWeight: 700, color: T.indigo }}>▶ PROCESSING</div>
        </div>
      </div>
      <div style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#334155', marginBottom: 10 }}>Visually Similar · From Your Trade History</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {matches.map((m, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid ${m.w ? 'rgba(0,143,103,0.3)' : 'rgba(223,28,48,0.25)'}`, padding: '8px 10px' }}>
              <svg width="100%" height="28" viewBox="0 0 50 26" preserveAspectRatio="none">
                <path d={m.path} fill="none" stroke={m.w ? T.win : T.loss} strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: T.indigo }}>{m.sim}%</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: m.w ? T.win : T.loss }}>{m.r}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(168,85,247,0.1))', borderRadius: 8, border: '1px solid rgba(99,102,241,0.18)' }}>
          <span style={{ fontSize: 10, color: '#a5b4fc' }}>On visually similar setups: <strong style={{ color: T.win }}>78% win rate · avg +1.5R</strong></span>
        </div>
      </div>
    </div>
  );
};

/* ── AI Teacher Mockup (dark) ────────────────────────────────────────────── */
const AIMockup: React.FC = () => {
  const msgs = [
    { u: true,  t: "Why do I keep losing on BANKNIFTY Fridays?" },
    { u: false, t: "Looking at your 127 logged trades, Fridays show avg R of -0.3 vs +1.8 on Tuesdays. You're entering 40% more setups — the Friday expiry kill zones are different. Want me to isolate those trades?" },
    { u: true,  t: "Yes. And what's my biggest psychology issue?" },
    { u: false, t: "Your data shows revenge trading spikes after 2 losses — you take 3.4× more trades in the next 2 hours, with 23% win rate vs your 71% baseline. A hard 2-loss daily stop would improve overall metrics by ~18%." },
  ];
  return (
    <div style={{ background: T.darkCard, borderRadius: 18, border: `1px solid ${T.darkBdr}`, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', overflow: 'hidden', fontFamily: T.ff, maxWidth: 520 }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.15))', borderBottom: `1px solid ${T.darkBdr}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.gradBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MessageCircle size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>AI Trading Coach</div>
          <div style={{ fontSize: 9, color: T.indigo, fontWeight: 600 }}>Powered by Claude · Reads your trade history</div>
        </div>
      </div>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.u ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '82%', background: m.u ? T.gradBtn : 'rgba(255,255,255,0.06)', color: m.u ? '#fff' : '#cbd5e1', padding: '9px 13px', borderRadius: m.u ? '14px 14px 4px 14px' : '14px 14px 14px 4px', fontSize: 11, lineHeight: 1.6, border: m.u ? 'none' : `1px solid ${T.darkBdr}` }}>{m.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPARISON TABLE DATA
═══════════════════════════════════════════════════════════════════════════ */
const TABLE_ROWS: [string, boolean, boolean][] = [
  ['Detects ICT concepts in price action', true, true],
  ['Same generic signal for every trader', true, false],
  ['Knows YOUR personal win rate per setup', false, true],
  ['Visual similarity to YOUR past trades', false, true],
  ['Tracks YOUR psychology & mistake patterns', false, true],
  ['Learns and improves from your history', false, true],
  ['Per-trade R-multiple and adherence scoring', false, true],
];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
interface DropdownItemProps {
  to: string;
  title: string;
  description: string;
  onClick: () => void;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ to, title, description, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        padding: '10px 14px',
        borderRadius: '10px',
        background: hovered ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
        transition: 'background 0.2s',
        textDecoration: 'none'
      }}
    >
      <div style={{
        fontSize: '13px',
        fontWeight: '800',
        color: hovered ? '#6366f1' : '#0f172a',
        fontFamily: "'Manrope', sans-serif",
        marginBottom: '2px',
        transition: 'color 0.2s'
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '11px',
        fontWeight: '500',
        color: '#64748b',
        fontFamily: "'Inter', sans-serif"
      }}>
        {description}
      </div>
    </Link>
  );
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState<'products' | 'solutions' | 'resources' | null>(null);

  /* ── Cursor glow (hero section, CSS-transition based smooth follow) ── */
  const heroRef = useRef<HTMLElement>(null);
  const [glow, setGlow] = useState({ x: 640, y: 360 });

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setGlow({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <>
      <style>{STYLE_OVERRIDE}</style>

      <div data-lp="true" style={{ fontFamily: T.ff, minHeight: '100dvh', color: T.text, backgroundColor: T.lightBg, overflowX: 'hidden' }}>

        {/* ───────────────────────────────────────────────── NAVBAR ───── */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <svg width="26" height="24" viewBox="0 0 108 102" fill="none">
              <defs>
                <linearGradient id="lgNav" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <path d="M16 21h45.5l-3.5 11.5H41v40H26.5v-40H16Z" fill="url(#lgNav)" />
              <path d="M65 21h14.5L67.8 61H96l-3.5 11.5H50Z" fill={T.text} />
            </svg>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.05em', color: T.text, fontFamily: T.ffDisplay }}>TRADELYZE</span>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%' }}>
            {/* Products */}
            <div
              onMouseEnter={() => setActiveDropdown('products')}
              onMouseLeave={() => setActiveDropdown(null)}
              style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
            >
              <button id="nav-products-btn" style={{
                background: 'none',
                border: 'none',
                fontSize: 14,
                color: activeDropdown === 'products' ? T.indigo : T.textSub,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '24px 16px',
                transition: 'color 0.2s'
              }}>
                <span>Products</span>
                <ChevronDown size={14} style={{ transform: activeDropdown === 'products' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              
              {activeDropdown === 'products' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '320px',
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '16px',
                  padding: '12px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 1000
                }}>
                  <DropdownItem to="/products/journal" title="Trading Journal" description="Auto-sync and manual trade logging." onClick={() => setActiveDropdown(null)} />
                  <DropdownItem to="/products/analytics" title="Reports & Analytics" description="Advanced metrics and equity curves." onClick={() => setActiveDropdown(null)} />
                  <DropdownItem to="/products/playbooks" title="Strategy Playbooks" description="Build playbooks and auto-score setups." onClick={() => setActiveDropdown(null)} />
                  <DropdownItem to="/products/pattern-match" title="Visual Pattern Match" description="CLIP AI visual similarity pattern search." onClick={() => setActiveDropdown(null)} />
                  <DropdownItem to="/products/ai-teacher" title="AI Teacher" description="Claude-powered personalized coaching." onClick={() => setActiveDropdown(null)} />
                </div>
              )}
            </div>

            {/* Solutions */}
            <div
              onMouseEnter={() => setActiveDropdown('solutions')}
              onMouseLeave={() => setActiveDropdown(null)}
              style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
            >
              <button style={{
                background: 'none',
                border: 'none',
                fontSize: 14,
                color: activeDropdown === 'solutions' ? T.indigo : T.textSub,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '24px 16px',
                transition: 'color 0.2s'
              }}>
                <span>Solutions</span>
                <ChevronDown size={14} style={{ transform: activeDropdown === 'solutions' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              
              {activeDropdown === 'solutions' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '320px',
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '16px',
                  padding: '12px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 1000
                }}>
                  <DropdownItem to="/solutions/beginners" title="For Beginner Traders" description="Get started with journaling basics." onClick={() => setActiveDropdown(null)} />
                  <DropdownItem to="/solutions/developing" title="For Developing Traders" description="Refine setups and build discipline." onClick={() => setActiveDropdown(null)} />
                  <DropdownItem to="/solutions/profitable" title="For Profitable Traders" description="Maximize edge and scale payouts." onClick={() => setActiveDropdown(null)} />
                  <DropdownItem to="/solutions/ict-communities" title="For ICT Communities" description="Share setups and rules with your group." onClick={() => setActiveDropdown(null)} />
                </div>
              )}
            </div>

            {/* Supported Brokers */}
            <Link to="/supported-brokers" style={{
              fontSize: 14,
              color: T.textSub,
              fontWeight: 700,
              padding: '24px 16px',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }} onMouseEnter={(e) => e.currentTarget.style.color = T.indigo} onMouseLeave={(e) => e.currentTarget.style.color = T.textSub}>
              Supported Brokers
            </Link>

            {/* Pricing */}
            <Link to="/pricing" style={{
              fontSize: 14,
              color: T.textSub,
              fontWeight: 700,
              padding: '24px 16px',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }} onMouseEnter={(e) => e.currentTarget.style.color = T.indigo} onMouseLeave={(e) => e.currentTarget.style.color = T.textSub}>
              Pricing
            </Link>

            {/* Resources */}
            <div
              onMouseEnter={() => setActiveDropdown('resources')}
              onMouseLeave={() => setActiveDropdown(null)}
              style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
            >
              <button style={{
                background: 'none',
                border: 'none',
                fontSize: 14,
                color: activeDropdown === 'resources' ? T.indigo : T.textSub,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '24px 16px',
                transition: 'color 0.2s'
              }}>
                <span>Resources</span>
                <ChevronDown size={14} style={{ transform: activeDropdown === 'resources' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              
              {activeDropdown === 'resources' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '320px',
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '16px',
                  padding: '12px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 1000
                }}>
                  <DropdownItem to="/risk-calculator" title="Free Trading Tools" description="Use our risk & position calculator." onClick={() => setActiveDropdown(null)} />
                  <DropdownItem to="/resources/blog" title="Blog" description="Read articles on psychology & setups." onClick={() => setActiveDropdown(null)} />
                  <DropdownItem to="/resources/changelog" title="Changelog" description="See our latest updates & features." onClick={() => setActiveDropdown(null)} />
                  <DropdownItem to="/resources/community" title="Community" description="Join other ICT traders in our network." onClick={() => setActiveDropdown(null)} />
                </div>
              )}
            </div>
          </nav>

          {/* Right side Log In / Get Started */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link to="/login" style={{
              fontSize: 14,
              color: T.textSub,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'color 0.2s'
            }} onMouseEnter={(e) => e.currentTarget.style.color = T.indigo} onMouseLeave={(e) => e.currentTarget.style.color = T.textSub}>
              Log In
            </Link>
            <MagBtn
              onClick={() => navigate('/signup')}
              style={{
                background: T.gradBtn,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 22px',
                fontSize: 14,
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
              }}
            >
              Get Started
            </MagBtn>
          </div>
        </header>

        {/* ───────────────────────────────────────────────── HERO ─────── */}
        <section ref={heroRef} style={{ position: 'relative', overflow: 'hidden', padding: '108px 48px 80px', textAlign: 'center', background: '#fff' }}>
          {/* Cursor-reactive glow blob — CSS transition gives smooth lag */}
          <div style={{
            position: 'absolute', pointerEvents: 'none', zIndex: 0,
            width: 700, height: 700, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, rgba(168,85,247,0.07) 45%, transparent 70%)',
            filter: 'blur(70px)',
            left: glow.x - 350, top: glow.y - 350,
            transition: 'left 1.4s cubic-bezier(0.17,0.67,0.21,1.0), top 1.4s cubic-bezier(0.17,0.67,0.21,1.0)',
          }} />
          {/* Static ambient blobs */}
          <div style={{ position: 'absolute', top: -120, left: '8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: -80, right: '8%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,70,239,0.07) 0%, transparent 65%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto' }}>
            <Reveal>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 100, padding: '5px 16px', marginBottom: 30 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', ...T.gradText }}>✦ India's First ICT-Native Trading Journal</span>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 style={{ fontSize: 'clamp(42px, 7.5vw, 76px)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-0.035em', color: T.text, margin: '0 0 22px', fontFamily: T.ffDisplay }}>
                Tradelyze <G>learns you.</G><br />Not the market.
              </h1>
            </Reveal>

            <Reveal delay={180}>
              <p style={{ fontSize: 19, color: T.textSub, maxWidth: 560, margin: '0 auto 42px', lineHeight: 1.7, fontWeight: 400 }}>
                The intelligent trading journal built for ICT traders. Track every trade, decode your psychology, and get AI coaching grounded in your own data.
              </p>
            </Reveal>

            <Reveal delay={280}>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
                <MagBtn
                  onClick={() => navigate('/signup')}
                  style={{ background: T.gradBtn, color: '#fff', border: 'none', borderRadius: 14, padding: '17px 40px', fontSize: 16, fontWeight: 700, boxShadow: '0 10px 34px rgba(99,102,241,0.38)' }}
                >
                  Start 14-Day Free Trial
                </MagBtn>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{ background: 'transparent', color: T.text, border: '1.5px solid rgba(0,0,0,0.13)', borderRadius: 14, padding: '17px 28px', fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  See Features <ArrowRight size={16} />
                </button>
              </div>
              <p style={{ fontSize: 13, color: T.textMuted }}>14-day free trial · No credit card required · Cancel anytime</p>
            </Reveal>
          </div>

          {/* Hero dashboard mockup */}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 920, margin: '72px auto 0' }}>
            <Reveal delay={380}>
              <TiltCard maxAngle={4}>
                <DashMockup />
              </TiltCard>
            </Reveal>
          </div>
        </section>

        {/* ────────────────────────────────────────────── TRUST BAR ───── */}
        <section style={{ padding: '30px 48px', borderTop: '1px solid rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(0,0,0,0.05)', background: T.altBg }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
            {[
              { icon: '🇮🇳', l: 'Built for Indian ICT Traders', s: 'INR-native, India markets' },
              { icon: '⚡', l: 'AI Runs On Your Device', s: 'Zero server cost, full privacy' },
              { icon: '🔒', l: 'Your Data Stays Yours', s: 'Row-level security, no sharing' },
              { icon: '🎯', l: '14-Day Free Trial', s: 'Full access, no card needed' },
            ].map(t => (
              <Reveal key={t.l}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 5 }}>{t.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t.l}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{t.s}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ════════════════════════════ FEATURE SECTIONS ══════════════ */}
        <div id="features">

          {/* ── 1 · Trading Journal (light, mockup right) ──────────── */}
          <section style={{ padding: '130px 48px', background: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', fontSize: 340, fontWeight: 900, color: 'rgba(99,102,241,0.04)', lineHeight: 1, fontFamily: T.ffDisplay, userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.04em' }}>1</div>
            <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 90, alignItems: 'center' }}>
              <Reveal from="left">
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 100, padding: '5px 13px', marginBottom: 22 }}>
                    <BookOpen size={11} color={T.indigo} />
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.indigo }}>Trading Journal</span>
                  </div>
                  <h2 style={{ fontSize: 'clamp(30px,4.5vw,46px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', color: T.text, margin: '0 0 20px', fontFamily: T.ffDisplay }}>
                    Every trade,<br /><G>fully documented.</G>
                  </h2>
                  <p style={{ fontSize: 16, color: T.textSub, lineHeight: 1.75, margin: '0 0 30px' }}>
                    Sync live from Dhan, import CSV, or log manually. Capture entry/exit rules, psychology scores, chart screenshots, and mistakes — in one structured, ICT-native flow.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                    {['Dhan broker sync, CSV import, or manual entry','6-dimension psychology scoring per trade','Setup-specific entry/exit rule checklists','Chart screenshot storage & review'].map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={11} color={T.indigo} strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: 14, color: '#475569' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
              <Reveal from="right" delay={140}>
                <TiltCard maxAngle={6}><JournalMockup /></TiltCard>
              </Reveal>
            </div>
          </section>

          {/* ── 2 · Analytics & Reports (dark, mockup left) ────────── */}
          <section style={{ padding: '130px 48px', background: T.darkBg, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', fontSize: 340, fontWeight: 900, color: 'rgba(255,255,255,0.022)', lineHeight: 1, fontFamily: T.ffDisplay, userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.04em' }}>2</div>
            <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 90, alignItems: 'center' }}>
              <Reveal from="left" delay={100}>
                <TiltCard maxAngle={5}><ReportsMockup /></TiltCard>
              </Reveal>
              <Reveal from="right">
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.22)', borderRadius: 100, padding: '5px 13px', marginBottom: 22 }}>
                    <BarChart2 size={11} color={T.violet} />
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.violet }}>Analytics & Reports</span>
                  </div>
                  <h2 style={{ fontSize: 'clamp(30px,4.5vw,46px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', color: '#f1f5f9', margin: '0 0 20px', fontFamily: T.ffDisplay }}>
                    Reports that<br /><G>actually teach you.</G>
                  </h2>
                  <p style={{ fontSize: 16, color: T.textMuted, lineHeight: 1.75, margin: '0 0 30px' }}>
                    Monthly, annual, and advanced reports break down every dimension of your trading. Equity curve, mistake heat maps, kill-zone performance, and behavioral drift tracking.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                    {['Dashboard with live equity curve reconstruction','Monthly & annual P&L reports','Mistake taxonomy: technical, psychological, risk','Kill-zone and session-level performance split'].map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={11} color={T.violet} strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: 14, color: T.textMuted }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ── 3 · Strategy Playbooks (light, mockup right) ─────────── */}
          <section style={{ padding: '130px 48px', background: T.altBg, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', fontSize: 340, fontWeight: 900, color: 'rgba(99,102,241,0.04)', lineHeight: 1, fontFamily: T.ffDisplay, userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.04em' }}>3</div>
            <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 90, alignItems: 'center' }}>
              <Reveal from="left">
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 100, padding: '5px 13px', marginBottom: 22 }}>
                    <Layers size={11} color={T.indigo} />
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.indigo }}>Strategy Playbooks</span>
                  </div>
                  <h2 style={{ fontSize: 'clamp(30px,4.5vw,46px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', color: T.text, margin: '0 0 20px', fontFamily: T.ffDisplay }}>
                    Your setups.<br /><G>Your rules. Your edge.</G>
                  </h2>
                  <p style={{ fontSize: 16, color: T.textSub, lineHeight: 1.75, margin: '0 0 30px' }}>
                    Build playbooks for each of your ICT setups. The system auto-scores your rule adherence on every trade — so you always know where and when you break your own process.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                    {['Unlimited strategy playbooks with custom rules','Per-trade entry rule adherence auto-scoring','ICT concept tags: OB, FVG, CHoCH, MSS, PO3...','Per-strategy win rate and R-multiple analytics'].map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={11} color={T.indigo} strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: 14, color: '#475569' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
              <Reveal from="right" delay={140}>
                <TiltCard maxAngle={6}><StrategyMockup /></TiltCard>
              </Reveal>
            </div>
          </section>

          {/* ── 4 · Visual Pattern Match (dark, featured, mockup left) ── */}
          <section style={{ padding: '130px 48px', background: T.darkBg, position: 'relative', overflow: 'hidden' }}>
            {/* Extra glow for emphasis */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.13) 0%, transparent 65%)', filter: 'blur(70px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', fontSize: 340, fontWeight: 900, color: 'rgba(255,255,255,0.022)', lineHeight: 1, fontFamily: T.ffDisplay, userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.04em' }}>4</div>
            <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 90, alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <Reveal from="left" delay={100}>
                <TiltCard maxAngle={5}><VisualMockup /></TiltCard>
              </Reveal>
              <Reveal from="right">
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.22)', borderRadius: 100, padding: '5px 13px' }}>
                      <Eye size={11} color={T.violet} />
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.violet }}>Visual Pattern Match</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(0,143,103,0.12)', border: '1px solid rgba(0,143,103,0.28)', borderRadius: 100, padding: '5px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399' }}>✦ Exclusive to Tradelyze</span>
                    </div>
                  </div>
                  <h2 style={{ fontSize: 'clamp(30px,4.5vw,46px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', color: '#f1f5f9', margin: '0 0 20px', fontFamily: T.ffDisplay }}>
                    Your charts,<br /><G>searched by vision.</G>
                  </h2>
                  <p style={{ fontSize: 16, color: T.textMuted, lineHeight: 1.75, margin: '0 0 20px' }}>
                    Tradelyze uses CLIP — OpenAI's visual AI model — to read your chart screenshots and find the most visually similar setups from your own trade history. No competitor has this.
                  </p>
                  <div style={{ padding: '14px 18px', background: 'rgba(99,102,241,0.09)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, marginBottom: 28, fontSize: 13, color: '#a5b4fc', lineHeight: 1.65 }}>
                    <strong style={{ color: '#f1f5f9' }}>How it works:</strong> When you log a trade, the CLIP model encodes your chart as a 512-dimensional visual fingerprint — right in your browser, via WebAssembly. No image ever leaves your device. Similar setups are surfaced from your library in real time, with their historical outcomes.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                    {['Runs fully in-browser via WebAssembly — zero server calls','Searches your personal trade history only — fully private','Shows win rate and R statistics of visually similar setups','Gets smarter as your trade library grows'].map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(168,85,247,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={11} color={T.violet} strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: 14, color: T.textMuted }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ── 5 · AI Teacher (dark, In Beta, mockup right) ─────────── */}
          <section style={{ padding: '130px 48px', background: '#06060d', borderTop: '1px solid rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 25% 50%, rgba(217,70,239,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', fontSize: 340, fontWeight: 900, color: 'rgba(255,255,255,0.022)', lineHeight: 1, fontFamily: T.ffDisplay, userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.04em' }}>5</div>
            <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 90, alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <Reveal from="left">
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(217,70,239,0.09)', border: '1px solid rgba(217,70,239,0.22)', borderRadius: 100, padding: '5px 13px' }}>
                      <MessageCircle size={11} color={T.fuchsia} />
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.fuchsia }}>AI Trading Coach</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 100, padding: '5px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24' }}>In Beta</span>
                    </div>
                  </div>
                  <h2 style={{ fontSize: 'clamp(30px,4.5vw,46px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', color: '#f1f5f9', margin: '0 0 20px', fontFamily: T.ffDisplay }}>
                    Ask why.<br /><G>Get answers from your data.</G>
                  </h2>
                  <p style={{ fontSize: 16, color: T.textMuted, lineHeight: 1.75, margin: '0 0 20px' }}>
                    Claude reads your complete trade history — psychology scores, mistake patterns, win/loss streaks, setup adherence — and gives coaching grounded in your actual numbers. Not generic advice.
                  </p>
                  <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 10, marginBottom: 28, fontSize: 13, color: '#fbbf24', lineHeight: 1.65 }}>
                    ⚠️ Currently in beta — available to active users. Full access is included in the Pro plan at no extra charge.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                    {['Powered by Claude 3.5 Sonnet','Full context of your trade history sent privately','Identifies unique behavioral patterns in your data','Session-based coaching, not generic templates'].map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(217,70,239,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={11} color={T.fuchsia} strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: 14, color: T.textMuted }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
              <Reveal from="right" delay={140}>
                <TiltCard maxAngle={5}><AIMockup /></TiltCard>
              </Reveal>
            </div>
          </section>

        </div>{/* /features */}

        {/* ─────────────────────────────────── COMPARISON TABLE ─────── */}
        <section style={{ padding: '110px 48px', background: '#fff' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
            <Reveal>
              <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, letterSpacing: '-0.025em', color: T.text, marginBottom: 12, fontFamily: T.ffDisplay }}>
                Tradelyze vs. <G>Pine Script Indicators</G>
              </h2>
              <p style={{ fontSize: 16, color: T.textSub, marginBottom: 52 }}>
                Generic indicators tell every trader the same thing. Tradelyze tells you about <em>you</em>.
              </p>
            </Reveal>
            <Reveal delay={100}>
              <div style={{ borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: T.altBg, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                      <th style={{ padding: '14px 22px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.textMuted }}>Capability</th>
                      <th style={{ padding: '14px 22px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.textMuted, textAlign: 'center' }}>Pine Script</th>
                      <th style={{ padding: '14px 22px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', background: 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(168,85,247,0.07))', color: T.indigo }}>Tradelyze</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TABLE_ROWS.map(([label, pine, tl], i) => (
                      <tr key={i} style={{ borderBottom: i < TABLE_ROWS.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                        <td style={{ padding: '14px 22px', color: '#374151', fontWeight: 500 }}>{label}</td>
                        <td style={{ padding: '14px 22px', textAlign: 'center' }}>
                          {pine ? <Check size={16} color={T.win} strokeWidth={2.5} style={{ display: 'inline' }} /> : <X size={16} color={T.loss} strokeWidth={2.5} style={{ display: 'inline' }} />}
                        </td>
                        <td style={{ padding: '14px 22px', textAlign: 'center', background: 'rgba(99,102,241,0.025)' }}>
                          {tl ? <Check size={16} color={T.win} strokeWidth={2.5} style={{ display: 'inline' }} /> : <X size={16} color={T.loss} strokeWidth={2.5} style={{ display: 'inline' }} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─────────────────────────────────────────────── PRICING ───── */}
        <section id="pricing" style={{ padding: '110px 48px', background: T.altBg }}>
          <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
            <Reveal>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.16)', borderRadius: 100, padding: '5px 16px', marginBottom: 20 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.indigo }}>Pricing</span>
              </div>
              <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, letterSpacing: '-0.025em', color: T.text, marginBottom: 8, fontFamily: T.ffDisplay }}>
                Simple pricing.<br /><G>Everything included.</G>
              </h2>
              <p style={{ fontSize: 15, color: T.textSub, marginBottom: 50 }}>One plan. Full access. No usage limits, no hidden fees.</p>
            </Reveal>
            <Reveal delay={100}>
              <TiltCard maxAngle={4}>
                <div style={{ background: '#fff', borderRadius: 22, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 24px 80px rgba(99,102,241,0.12), 0 4px 20px rgba(0,0,0,0.05)', padding: '38px 34px', position: 'relative', textAlign: 'left' }}>
                  {/* Gradient top strip */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: T.grad, borderRadius: '22px 22px 0 0' }} />
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.14)', borderRadius: 100, padding: '3px 11px', marginBottom: 22 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.indigo }}>Pro Plan</span>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 56, fontWeight: 900, color: T.text, letterSpacing: '-0.03em', fontFamily: T.ffDisplay }}>₹1,999</span>
                    <span style={{ fontSize: 15, color: T.textMuted, marginLeft: 4 }}>/month</span>
                  </div>
                  <p style={{ fontSize: 14, color: T.textSub, marginBottom: 28 }}>Everything. No limits. No per-session coaching fees.</p>
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 30 }}>
                    {['Unlimited trade logging & storage','Full reports: dashboard, monthly, annual, advanced','Strategy Playbooks with rule adherence scoring','Visual Pattern Match (CLIP, runs on your device)','AI Trading Coach — Claude 3.5 Sonnet (Beta)','Dhan broker sync + CSV import','ICT-native concept taxonomy','Priority support'].map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: T.win, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <Check size={10} color="white" strokeWidth={2.8} />
                        </div>
                        <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.45 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <MagBtn
                    onClick={() => navigate('/signup')}
                    style={{ width: '100%', background: T.gradBtn, color: '#fff', border: 'none', borderRadius: 13, padding: '16px', fontSize: 16, fontWeight: 700, boxShadow: '0 8px 24px rgba(99,102,241,0.32)', display: 'block' }}
                  >
                    Start 14-Day Free Trial
                  </MagBtn>
                  <p style={{ fontSize: 12, color: T.textMuted, textAlign: 'center', marginTop: 12 }}>Free for 14 days · Then ₹1,999/month · Cancel anytime</p>
                </div>
              </TiltCard>
            </Reveal>
          </div>
        </section>

        {/* ──────────────────────────────────────────────── FINAL CTA ── */}
        <section style={{ padding: '130px 48px', background: T.darkBg, position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.09) 40%, transparent 70%)', filter: 'blur(90px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>
            <Reveal>
              <h2 style={{ fontSize: 'clamp(38px,6.5vw,68px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.035em', color: '#f1f5f9', marginBottom: 20, fontFamily: T.ffDisplay }}>
                Ready to understand<br /><G>your edge?</G>
              </h2>
              <div style={{ fontSize: 18, color: '#94a3b8', marginBottom: 50, lineHeight: 1.7 }}>
                Join ICT traders building real, data-backed self-awareness — trade by trade.
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <MagBtn
                  onClick={() => navigate('/signup')}
                  style={{ background: T.gradBtn, color: '#fff', border: 'none', borderRadius: 14, padding: '19px 48px', fontSize: 17, fontWeight: 700, boxShadow: '0 12px 48px rgba(99,102,241,0.45)' }}
                >
                  Start Free Trial
                </MagBtn>
                <button
                  onClick={() => navigate('/pricing')}
                  style={{ background: 'transparent', color: T.textMuted, border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '19px 38px', fontSize: 17, fontWeight: 600, cursor: 'pointer' }}
                >
                  View Pricing
                </button>
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 24 }}>14-day free trial · No credit card · Cancel anytime</div>
            </Reveal>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────── FOOTER ── */}
        <footer style={{ background: '#040408', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '52px 48px 32px' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 40, marginBottom: 52 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <svg width="22" height="20" viewBox="0 0 108 102" fill="none">
                    <defs>
                      <linearGradient id="lgFt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                    <path d="M16 21h45.5l-3.5 11.5H41v40H26.5v-40H16Z" fill="url(#lgFt)" />
                    <path d="M65 21h14.5L67.8 61H96l-3.5 11.5H50Z" fill="#94a3b8" />
                  </svg>
                  <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.1em', color: '#e2e8f0', fontFamily: T.ffDisplay }}>TRADELYZE</span>
                </div>
                <p style={{ fontSize: 13, color: '#475569', maxWidth: 230, lineHeight: 1.65 }}>The intelligent trading journal for ICT traders. Learns you. Not the market.</p>
              </div>
              <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#1e293b', marginBottom: 14 }}>Product</div>
                  {['Dashboard','Daily Journal','Reports','Strategies'].map(l => (
                    <div key={l} style={{ marginBottom: 10 }}>
                      <Link to="/dashboard" style={{ fontSize: 13, color: '#475569' }}>{l}</Link>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#1e293b', marginBottom: 14 }}>Account</div>
                  {[{l:'Log In',to:'/login'},{l:'Sign Up',to:'/signup'},{l:'Pricing',to:'/pricing'}].map(x => (
                    <div key={x.l} style={{ marginBottom: 10 }}>
                      <Link to={x.to} style={{ fontSize: 13, color: '#475569' }}>{x.l}</Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <p style={{ fontSize: 11, color: '#1e293b' }}>© 2026 VPDP Tradelyze Tech Pvt Ltd · Bengaluru, India</p>
              <p style={{ fontSize: 10, color: '#1e293b', maxWidth: 580, textAlign: 'right', lineHeight: 1.55 }}>
                Tradelyze is a trading performance analysis platform and is not a financial advisor, broker, or asset management service. Trading involves structural risk of capital loss.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
