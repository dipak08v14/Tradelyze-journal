import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'

// Initialize Supabase client (using direct fetch calls to communicate with Supabase API)

// ── AUTH HELPERS ──
export async function getStoredSession() {
  return new Promise(resolve => {
    chrome.storage.local.get(['tradelyze_session'], result => {
      resolve(result.tradelyze_session || null)
    })
  })
}

export async function storeSession(session) {
  return new Promise(resolve => {
    chrome.storage.local.set({ tradelyze_session: session }, resolve)
  })
}

export async function clearSession() {
  return new Promise(resolve => {
    chrome.storage.local.remove(['tradelyze_session', 'tradelyze_user'], resolve)
  })
}

// ── SUPABASE FETCH HELPER ──
async function supabaseFetch(endpoint, options = {}) {
  const session = await getStoredSession()
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': session ? `Bearer ${session.access_token}` : `Bearer ${SUPABASE_ANON_KEY}`
  }
  const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  })
  return response.json()
}

// ── SUPABASE AUTH ──
async function signIn(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ email, password })
  })
  const data = await response.json()
  if (data.access_token) {
    await storeSession(data)
    await chrome.storage.local.set({
      tradelyze_user: {
        id: data.user.id,
        email: data.user.email
      }
    })
    return { success: true, user: data.user }
  }
  return { success: false, error: data.error_description || 'Login failed' }
}

async function signOut() {
  const session = await getStoredSession()
  if (session) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`
      }
    }).catch(() => {})
  }
  await clearSession()
}

// ── FETCH USER STRATEGIES ──
async function fetchStrategies(userId) {
  const data = await supabaseFetch(
    `/rest/v1/strategies?user_id=eq.${userId}&status=eq.active&select=id,name,type_of_strategy,sr_no&order=sr_no`
  )
  return data || []
}

// ── FETCH STRATEGY RULES ──
async function fetchStrategyRules(strategyId, userId) {
  const data = await supabaseFetch(
    `/rest/v1/strategy_rules?strategy_id=eq.${strategyId}&user_id=eq.${userId}&rule_type=eq.entry&order=rule_order`
  )
  return data || []
}

// ── FETCH STRATEGY STATS ──
async function fetchStrategyStats(strategyId, userId) {
  const data = await supabaseFetch(
    `/rest/v1/trades?strategy_id=eq.${strategyId}&user_id=eq.${userId}&select=status,pnl,r_multiple`
  )
  if (!data || data.length === 0) return null
  const wins = data.filter(t => t.status === 'Win')
  const losses = data.filter(t => t.status === 'Loss')
  const total = data.length
  const winRate = total > 0 ? Math.round((wins.length / total) * 100) : 0
  const avgR = data.filter(t => t.r_multiple).length > 0
    ? (data.filter(t => t.r_multiple).reduce((s, t) => s + t.r_multiple, 0) / data.filter(t => t.r_multiple).length).toFixed(2)
    : 0
  const totalPnl = data.reduce((s, t) => s + (t.pnl || 0), 0)
  return { total, wins: wins.length, losses: losses.length, winRate, avgR, totalPnl }
}

// ── FETCH USER MONTHLY STATS (for popup) ──
async function fetchMonthlyStats(userId) {
  const now = new Date()
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const month = months[now.getMonth()]
  const year = now.getFullYear()
  const data = await supabaseFetch(
    `/rest/v1/trades?user_id=eq.${userId}&month=eq.${month}&year=eq.${year}&select=status,pnl,r_multiple`
  )
  if (!data || data.length === 0) return { total: 0, winRate: 0, totalPnl: 0, avgR: 0 }
  const wins = data.filter(t => t.status === 'Win')
  const winRate = Math.round((wins.length / data.length) * 100)
  const totalPnl = data.reduce((s, t) => s + (t.pnl || 0), 0)
  const rTrades = data.filter(t => t.r_multiple)
  const avgR = rTrades.length > 0 ? (rTrades.reduce((s, t) => s + t.r_multiple, 0) / rTrades.length).toFixed(2) : 0
  return { total: data.length, winRate, totalPnl, avgR, month, year }
}

// ── VECTOR SIMILARITY SEARCH ──
async function searchSimilarTrades(embedding, userId, setupName) {
  // Call the match_trades RPC function
  const session = await getStoredSession()
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_trades`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': session ? `Bearer ${session.access_token}` : `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      query_embedding: embedding,
      match_user_id: userId,
      match_strategy: null,
      similarity_threshold: 0.40,
      match_count: 5
    })
  })
  const matches = await response.json()

  if (!matches || !Array.isArray(matches)) return []

  // Fetch trade details for each match
  if (matches.length === 0) return []
  const tradeIds = matches.map(m => m.trade_id).join(',')
  const tradeDetails = await supabaseFetch(
    `/rest/v1/trades?id=in.(${tradeIds})&user_id=eq.${userId}&select=id,date,symbol,call_put,pnl,r_multiple,status`
  )

  return matches.map(m => {
    const detail = (tradeDetails || []).find(t => t.id === m.trade_id)
    return { ...m, ...detail }
  }).sort((a, b) => b.similarity - a.similarity)
}

// ── WEB APP SCAN DELEGATOR ──
async function generateEmbeddingViaOffscreen(imageDataUrl) {
  const response = await fetch('https://tradelyze.vercel.app/api/scan-chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl })
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return data.embedding
}

// ── MESSAGE HANDLER ──
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handle = async () => {
    switch (message.type) {

      case 'SIGN_IN':
        return await signIn(message.email, message.password)

      case 'SIGN_OUT':
        await signOut()
        return { success: true }

      case 'GET_SESSION':
        const session = await getStoredSession()
        const userData = await new Promise(resolve => {
          chrome.storage.local.get(['tradelyze_user'], r => resolve(r.tradelyze_user))
        })
        return { session, user: userData }

      case 'GET_MONTHLY_STATS':
        return await fetchMonthlyStats(message.userId)

      case 'GET_STRATEGIES':
        return await fetchStrategies(message.userId)

      case 'GET_STRATEGY_RULES':
        return await fetchStrategyRules(message.strategyId, message.userId)

      case 'GET_STRATEGY_STATS':
        return await fetchStrategyStats(message.strategyId, message.userId)

      case 'SEARCH_SIMILAR':
        return await searchSimilarTrades(message.embedding, message.userId, message.setupName)

      case 'GENERATE_EMBEDDING':
        return await generateEmbeddingViaOffscreen(message.imageDataUrl)

      case 'FIRE_NOTIFICATION':
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: message.title,
          message: message.body,
          priority: 2
        })
        return { sent: true }
    }
  }

  handle().then(sendResponse).catch(err => sendResponse({ error: err.message }))
  return true // Keep channel open for async
})
