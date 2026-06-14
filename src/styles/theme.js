export const THEMES = {
  warm: {
    bg: '#f7f5f0',
    card: '#ffffff',
    cardHover: '#fdfcfa',
    border: 'rgba(0,0,0,.07)',
    borderMd: 'rgba(0,0,0,.12)',
    text: '#1c1917',
    sub: '#78716c',
    muted: '#a8a29e',
    bar: 'rgba(0,0,0,.05)',
    row: 'rgba(0,0,0,.02)',
    topbar: '#ffffff',
    dark: false
  },
  cloud: {
    bg: '#eef1f8',
    card: '#f8faff',
    cardHover: '#f0f4fe',
    border: 'rgba(0,0,0,.07)',
    borderMd: 'rgba(0,0,0,.12)',
    text: '#111827',
    sub: '#6b7280',
    muted: '#9ca3af',
    bar: 'rgba(0,0,0,.05)',
    row: 'rgba(0,0,0,.02)',
    topbar: '#f8faff',
    dark: false
  },
  slate: {
    bg: '#f0f2f7',
    card: '#ffffff',
    cardHover: '#f8f9fc',
    border: 'rgba(0,0,0,.08)',
    borderMd: 'rgba(0,0,0,.14)',
    text: '#0f172a',
    sub: '#64748b',
    muted: '#94a3b8',
    bar: 'rgba(0,0,0,.06)',
    row: 'rgba(0,0,0,.02)',
    topbar: '#ffffff',
    dark: false
  },
  charcoal: {
    bg: '#111318',
    card: '#191c22',
    cardHover: '#1e2128',
    border: 'rgba(255,255,255,.08)',
    borderMd: 'rgba(255,255,255,.14)',
    text: '#e8eaf0',
    sub: '#7e8694',
    muted: '#4f5666',
    bar: 'rgba(255,255,255,.07)',
    row: 'rgba(255,255,255,.04)',
    topbar: '#131519',
    dark: true
  },
  navy: {
    bg: '#060b18',
    card: '#0c1424',
    cardHover: '#101c30',
    border: 'rgba(255,255,255,.08)',
    borderMd: 'rgba(255,255,255,.14)',
    text: '#e2e8f0',
    sub: '#7b90b0',
    muted: '#4a5a72',
    bar: 'rgba(255,255,255,.06)',
    row: 'rgba(255,255,255,.03)',
    topbar: '#080d1c',
    dark: true
  },
  midnight: {
    bg: '#07080d',
    card: '#0e0f16',
    cardHover: '#13141e',
    border: 'rgba(255,255,255,.07)',
    borderMd: 'rgba(255,255,255,.12)',
    text: '#f1f5f9',
    sub: '#7c8599',
    muted: '#4a5168',
    bar: 'rgba(255,255,255,.06)',
    row: 'rgba(255,255,255,.03)',
    topbar: '#09090f',
    dark: true
  }
}

export const ACCENTS = {
  cyan:    { color: '#06b6d4', light: '#67e8f9', muted: 'rgba(6,182,212,.13)'   },
  indigo:  { color: '#6366f1', light: '#a5b4fc', muted: 'rgba(99,102,241,.13)'  },
  blue:    { color: '#3b82f6', light: '#93c5fd', muted: 'rgba(59,130,246,.13)'  },
  emerald: { color: '#10b981', light: '#6ee7b7', muted: 'rgba(16,185,129,.13)'  },
  gold:    { color: '#f59e0b', light: '#fcd34d', muted: 'rgba(245,158,11,.13)'  },
  rose:    { color: '#ec4899', light: '#f9a8d4', muted: 'rgba(236,72,153,.13)'  },
  coral:   { color: '#f97316', light: '#fdba74', muted: 'rgba(249,115,22,.13)'  }
}

export function applyTheme(themeId, accentId) {
  const t = THEMES[themeId] || THEMES.warm
  const a = ACCENTS[accentId] || ACCENTS.cyan
  const root = document.documentElement
  root.style.setProperty('--bg', t.bg)
  root.style.setProperty('--card', t.card)
  root.style.setProperty('--card-hover', t.cardHover)
  root.style.setProperty('--border', t.border)
  root.style.setProperty('--border-md', t.borderMd)
  root.style.setProperty('--text', t.text)
  root.style.setProperty('--text-sub', t.sub)
  root.style.setProperty('--text-muted', t.muted)
  root.style.setProperty('--bar', t.bar)
  root.style.setProperty('--row', t.row)
  root.style.setProperty('--topbar', t.topbar)
  root.style.setProperty('--accent', a.color)
  root.style.setProperty('--accent-light', a.light)
  root.style.setProperty('--accent-muted', a.muted)
  localStorage.setItem('tl-theme', themeId)
  localStorage.setItem('tl-accent', accentId)
}
