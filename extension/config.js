// Supabase connection — anon key is safe to include (RLS protects data)
export const SUPABASE_URL = 'https://bcpwbxqlmvnyhhsonzbo.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_jumNCIXd8RVe_KCo5_prwQ_IdjDBgJn'

// Tradelyze web app URL (for linking)
export const APP_URL = 'https://tradelyze.vercel.app'

// Scoring weights (from V2 spec — locked)
export const ICT_WEIGHT = 0.60
export const VISUAL_WEIGHT = 0.40

// Alert thresholds
export const THRESHOLDS = {
  HIGH_CONFIDENCE: 85,
  STRONG: 75,
  FORMING: 65,
  WATCHING: 50
}

// IST sessions (UTC offset +5:30)
export const IST_SESSIONS = {
  ASIAN: { start: 530, end: 1030, label: 'Asian Session' },
  LONDON: { start: 1330, end: 1530, label: 'London Killzone' },
  NY_OPEN: { start: 1830, end: 2030, label: 'NY Open Killzone' },
  NY_LUNCH: { start: 2100, end: 2200, label: 'NY Lunch (Avoid)' },
  NY_CLOSE: { start: 100, end: 230, label: 'NY Close' }
}
