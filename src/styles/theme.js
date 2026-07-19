export const THEMES = {
  warm:     { bg:'#f7f5f0', card:'#ffffff', cardHover:'#fdfcfa', bgSub:'#faf9f6', border:'rgba(0,0,0,.07)', borderMd:'rgba(0,0,0,.12)', text:'#1c1917', sub:'#57534e', muted:'#57534e', bar:'rgba(0,0,0,.05)', row:'rgba(0,0,0,.02)', topbar:'#ffffff', dark:false },
  cloud:    { bg:'#eef1f8', card:'#f8faff', cardHover:'#f0f4fe', bgSub:'#f3f5fa', border:'rgba(0,0,0,.07)', borderMd:'rgba(0,0,0,.12)', text:'#111827', sub:'#4b5563', muted:'#4b5563', bar:'rgba(0,0,0,.05)', row:'rgba(0,0,0,.02)', topbar:'#f8faff', dark:false },
  slate:    { bg:'#f0f2f7', card:'#ffffff', cardHover:'#f8f9fc', bgSub:'#f5f7fb', border:'rgba(0,0,0,.08)', borderMd:'rgba(0,0,0,.14)', text:'#0f172a', sub:'#475569', muted:'#475569', bar:'rgba(0,0,0,.06)', row:'rgba(0,0,0,.02)', topbar:'#ffffff', dark:false },
  charcoal: { bg:'#111318', card:'#191c22', cardHover:'#1e2128', bgSub:'#15181e', border:'rgba(255,255,255,.08)', borderMd:'rgba(255,255,255,.14)', text:'#e8eaf0', sub:'#9aa2b0', muted:'#9aa2b0', bar:'rgba(255,255,255,.07)', row:'rgba(255,255,255,.04)', topbar:'#131519', dark:true },
  navy:     { bg:'#060b18', card:'#0c1424', cardHover:'#101c30', bgSub:'#090e1d', border:'rgba(255,255,255,.08)', borderMd:'rgba(255,255,255,.14)', text:'#e2e8f0', sub:'#9db4d4', muted:'#9db4d4', bar:'rgba(255,255,255,.06)', row:'rgba(255,255,255,.03)', topbar:'#080d1c', dark:true },
  midnight: { bg:'#07080d', card:'#0e0f16', cardHover:'#13141e', bgSub:'#0a0b11', border:'rgba(255,255,255,.07)', borderMd:'rgba(255,255,255,.12)', text:'#f1f5f9', sub:'#9aa3b8', muted:'#9aa3b8', bar:'rgba(255,255,255,.06)', row:'rgba(255,255,255,.03)', topbar:'#09090f', dark:true }
}

export const ACCENTS = {
  cyan:    { color:'#06b6d4', light:'#67e8f9', muted:'rgba(6,182,212,.13)'  },
  indigo:  { color:'#6366f1', light:'#a5b4fc', muted:'rgba(99,102,241,.13)' },
  blue:    { color:'#3b82f6', light:'#93c5fd', muted:'rgba(59,130,246,.13)' },
  emerald: { color:'#10b981', light:'#6ee7b7', muted:'rgba(16,185,129,.13)' },
  gold:    { color:'#f59e0b', light:'#fcd34d', muted:'rgba(245,158,11,.13)' },
  rose:    { color:'#ec4899', light:'#f9a8d4', muted:'rgba(236,72,153,.13)' },
  coral:   { color:'#f97316', light:'#fdba74', muted:'rgba(249,115,22,.13)' }
}

export function applyTheme(themeId, accentId) {
  const t = THEMES[themeId] || THEMES.warm
  const a = ACCENTS[accentId] || ACCENTS.cyan
  const r = document.documentElement
  r.style.setProperty('--bg', t.bg)
  r.style.setProperty('--bg-sub', t.bgSub)
  r.style.setProperty('--card', t.card)
  r.style.setProperty('--card-hover', t.cardHover)
  r.style.setProperty('--border', t.border)
  r.style.setProperty('--border-md', t.borderMd)
  r.style.setProperty('--text', t.text)
  r.style.setProperty('--text-sub', t.sub)
  r.style.setProperty('--text-muted', t.muted)
  r.style.setProperty('--bar', t.bar)
  r.style.setProperty('--row', t.row)
  r.style.setProperty('--topbar', t.topbar)
  r.style.setProperty('--accent', a.color)
  r.style.setProperty('--accent-light', a.light)
  r.style.setProperty('--accent-muted', a.muted)
  localStorage.setItem('tl-theme', themeId)
  localStorage.setItem('tl-accent', accentId)
}
