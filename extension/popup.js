function sendMsg(type, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, ...data }, response => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve(response)
    })
  })
}

function show(id) {
  ['login-view','dashboard-view','loading-view'].forEach(v => {
    const el = document.getElementById(v)
    if (el) el.classList.toggle('hidden', v !== id)
  })
}

async function loadDashboard(user) {
  show('dashboard-view')
  document.getElementById('user-email').textContent = user.email

  const stats = await sendMsg('GET_MONTHLY_STATS', { userId: user.id })
  if (stats) {
    const pnl = stats.totalPnl || 0
    document.getElementById('stat-pnl').textContent =
      (pnl >= 0 ? '+₹' : '-₹') + Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })
    document.getElementById('stat-pnl').style.color = pnl >= 0 ? '#22C55E' : '#EF4444'
    document.getElementById('stat-wr').textContent = stats.winRate + '%'
    document.getElementById('stat-wr').style.color = stats.winRate >= 60 ? '#22C55E' : stats.winRate >= 40 ? '#F59E0B' : '#EF4444'
    document.getElementById('stat-trades').textContent = stats.total
    document.getElementById('stat-r').textContent = (stats.avgR >= 0 ? '+' : '') + stats.avgR + 'R'
    document.getElementById('stat-r').style.color = stats.avgR >= 0 ? '#22C55E' : '#EF4444'

    const badge = document.getElementById('status-badge')
    badge.innerHTML = '<span class="dot"></span> Tradelyze Live Active · ' + (stats.month || '') + ' ' + (stats.year || '')
  }
}

async function init() {
  show('loading-view')
  const { session, user } = await sendMsg('GET_SESSION')

  if (session && user) {
    loadDashboard(user)
  } else {
    show('login-view')
  }

  // Login form
  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('email-input').value.trim()
    const password = document.getElementById('password-input').value
    const errEl = document.getElementById('login-error')
    errEl.classList.add('hidden')

    if (!email || !password) {
      errEl.textContent = 'Please enter email and password'
      errEl.classList.remove('hidden')
      return
    }

    document.getElementById('login-btn').textContent = 'Signing in...'
    const result = await sendMsg('SIGN_IN', { email, password })

    if (result.success) {
      loadDashboard(result.user)
    } else {
      errEl.textContent = result.error || 'Login failed'
      errEl.classList.remove('hidden')
      document.getElementById('login-btn').textContent = 'Sign In'
    }
  })

  // Enter key on password
  document.getElementById('password-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click()
  })

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await sendMsg('SIGN_OUT')
    show('login-view')
  })
}

init()
