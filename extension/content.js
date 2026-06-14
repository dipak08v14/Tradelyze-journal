// Only run on TradingView
if (!window.location.hostname.includes('tradingview.com')) {
  throw new Error('Not TradingView')
}

// ── STATE ──
let overlayEl = null
let currentUser = null
let strategies = []
let selectedStrategyId = null
let strategyRules = []
let ruleAnswers = {} // { ruleId: true/false/null }
let strategyStats = null
let isScanning = false
let scanResults = null
let isDragging = false
let dragOffsetX = 0, dragOffsetY = 0
let overlayVisible = true
let autoScanEnabled = true
let autoScanTimeout = null
let autoScanInterval = null

// ── HELPERS ──
function sendMsg(type, data = {}) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type, ...data }, response => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
        else resolve(response)
      })
    } catch (e) { reject(e) }
  })
}

function getScoreColor(score) {
  if (score >= 70) return 'tl-score-green'
  if (score >= 50) return 'tl-score-amber'
  if (score > 0) return 'tl-score-red'
  return 'tl-score-gray'
}

function getProgressColor(score) {
  if (score >= 70) return '#22C55E'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

function getCurrentIST() {
  const now = new Date()
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const ist = new Date(utc + (5.5 * 3600000))
  return ist.getHours() * 100 + ist.getMinutes()
}

function getSessionInfo() {
  const t = getCurrentIST()
  if (t >= 530 && t < 1030) return { name: 'Asian Session', active: true }
  if (t >= 1330 && t < 1530) return { name: '🎯 London Killzone', active: true }
  if (t >= 1830 && t < 2030) return { name: '🎯 NY Open Killzone', active: true }
  if (t >= 2100 && t < 2200) return { name: 'NY Lunch — Avoid', active: false }
  return { name: 'Off-Session', active: false }
}

function getISTTimeString() {
  const now = new Date()
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const ist = new Date(utc + (5.5 * 3600000))
  return ist.toTimeString().slice(0, 5) + ' IST'
}

function getTradingViewSymbol() {
  // Try URL first
  const urlMatch = window.location.href.match(/symbol=([A-Z0-9:]+)/i)
  if (urlMatch) return urlMatch[1].replace(':', '/')
  // Try page title
  const titleMatch = document.title.match(/^([A-Z0-9]+(?:USD|INR|BTC)?)/i)
  if (titleMatch) return titleMatch[1]
  return 'Unknown'
}

function captureChartCanvas() {
  // TradingView renders chart on canvas elements
  // Find the largest canvas = main chart
  const canvases = Array.from(document.querySelectorAll('canvas'))
  if (canvases.length === 0) return null
  const main = canvases.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]
  try {
    return main.toDataURL('image/jpeg', 0.8) // JPEG for smaller size
  } catch (e) {
    return null
  }
}

function calcICTScore() {
  const answered = strategyRules.filter(r => ruleAnswers[r.id] === true || ruleAnswers[r.id] === false)
  if (strategyRules.length === 0) return 0
  const yesCount = strategyRules.filter(r => ruleAnswers[r.id] === true).length
  return Math.round((yesCount / strategyRules.length) * 100)
}

function calcCombinedScore(ictScore, visualScore) {
  return Math.round((ictScore * 0.60) + (visualScore * 0.40))
}

function getRecommendation(combined, ictScore, visualScore, visualMatches) {
  // Check for loss pattern warning
  const lossMatches = (visualMatches || []).filter(m => m.status === 'Loss')
  const hasLossWarning = lossMatches.length > 0 && lossMatches[0].similarity > 0.70

  if (combined >= 85) return { text: '⚡ HIGH CONFIDENCE — Ready', cls: 'tl-rec-ready' }
  if (combined >= 75) {
    if (hasLossWarning) return { text: '⚠ PREPARE — But similar to past loss', cls: 'tl-rec-monitor' }
    return { text: '✓ STRONG SETUP — Prepare', cls: 'tl-rec-prepare' }
  }
  if (combined >= 65) return { text: '👁 SETUP FORMING — Monitor', cls: 'tl-rec-monitor' }
  if (combined >= 50) return { text: '⏳ FORMING — Watch next candle', cls: 'tl-rec-monitor' }
  return { text: '✗ LOW SCORE — Wait for better setup', cls: 'tl-rec-wait' }
}

// ── OVERLAY RENDER ──
function renderOverlay() {
  if (!overlayEl) return

  const session = getSessionInfo()
  const ictScore = calcICTScore()
  const visualScore = scanResults?.visualScore || 0
  const combined = scanResults?.clipUnavailable 
    ? ictScore 
    : calcCombinedScore(ictScore, visualScore)
  const symbol = getTradingViewSymbol()
  const selectedStrategy = strategies.find(s => s.id === selectedStrategyId)

  let html = `
    <div class="tl-header" id="tl-drag-handle">
      <span class="tl-logo">TRADELYZE LIVE</span>
      <div class="tl-status">
        <div class="tl-dot"></div>
        <span class="tl-status-text">${getISTTimeString()}</span>
      </div>
      <button class="tl-close" id="tl-close-btn">✕</button>
    </div>
    <div class="tl-body">
  `

  // ── SESSION STATUS ──
  html += `
    <div class="tl-section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span class="${session.active ? 'tl-session-badge' : 'tl-session-badge tl-session-miss'}">
          ${session.active ? '●' : '○'} ${session.name}
        </span>
        <button id="tl-auto-toggle-btn" class="tl-toggle-btn" style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; border: 1px solid ${autoScanEnabled ? '#6366F1' : '#2A2D3A'}; color: ${autoScanEnabled ? '#6366F1' : '#6B7280'}; background: transparent; cursor: pointer;">
          Auto ${autoScanEnabled ? '●' : '○'}
        </button>
      </div>
      <span style="font-size:10px;color:#6B7280;">${symbol}</span>
      <div id="tl-auto-status" style="font-size:10px; color:#6366F1; margin-bottom:6px; margin-top:4px;">
        ${isScanning ? '⟳ Scanning...' : (scanResults?.autoScanned ? `⟳ Last scan: ${scanResults.scannedAt}` : '⟳ Auto-scanning on candle close')}
      </div>
    </div>
  `

  // ── SETUP SELECTOR ──
  html += `
    <div class="tl-section">
      <div class="tl-label">Select Setup</div>
      <select class="tl-select" id="tl-strategy-select">
        <option value="">— Choose your setup —</option>
        ${strategies.map(s => `
          <option value="${s.id}" ${s.id === selectedStrategyId ? 'selected' : ''}>
            #${s.sr_no} ${s.name}
          </option>
        `).join('')}
      </select>
    </div>
  `

  // ── SETUP STATS ──
  if (strategyStats && selectedStrategy) {
    html += `
      <div class="tl-section">
        <div class="tl-label">YOUR Stats on This Setup</div>
        <div style="display:flex;gap:12px;font-size:11px;">
          <span>Win Rate: <strong class="tl-score-${strategyStats.winRate >= 60 ? 'green' : strategyStats.winRate >= 40 ? 'amber' : 'red'}">${strategyStats.winRate}%</strong></span>
          <span>Avg R: <strong class="${strategyStats.avgR >= 1 ? 'tl-score-green' : 'tl-score-red'}">${strategyStats.avgR}R</strong></span>
          <span>Trades: <strong style="color:#F9FAFB">${strategyStats.total}</strong></span>
        </div>
      </div>
    `
  }

  // ── ICT CHECKLIST ──
  if (strategyRules.length > 0) {
    html += `
      <div class="tl-section">
        <div class="tl-label">ICT Entry Rules 
          <span style="float:right;color:#6B7280">${strategyRules.filter(r => ruleAnswers[r.id] === true).length}/${strategyRules.length} ✓</span>
        </div>
        <div id="tl-rules-list">
          ${strategyRules.map(r => `
            <div class="tl-rule-row">
              <span class="tl-rule-num">#${r.rule_order}</span>
              <span class="tl-rule-text">${r.rule_text}</span>
              <div class="tl-yn-group">
                <button class="tl-yn-btn ${ruleAnswers[r.id] === true ? 'y-active' : ''}" 
                        data-rule="${r.id}" data-val="true">Y</button>
                <button class="tl-yn-btn ${ruleAnswers[r.id] === false ? 'n-active' : ''}"
                        data-rule="${r.id}" data-val="false">N</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  } else if (selectedStrategyId) {
    html += `<div class="tl-empty">No entry rules defined for this setup.<br>Add rules in Tradelyze → Strategies.</div>`
  } else {
    html += `<div class="tl-empty">Select a setup above to load your ICT rules checklist.</div>`
  }

  // ── SCORES ──
  if (selectedStrategyId && strategyRules.length > 0) {
    html += `<hr class="tl-divider">`
    html += `
      <div class="tl-section">
        <div class="tl-score-row">
          <span class="tl-score-label">ICT Rules</span>
          <span class="tl-score-val ${getScoreColor(ictScore)}">${ictScore}%</span>
        </div>
        <div class="tl-progress-bar">
          <div class="tl-progress-fill" style="width:${ictScore}%;background:${getProgressColor(ictScore)}"></div>
        </div>
        <div class="tl-score-row" style="margin-top:6px">
          <span class="tl-score-label">Visual Pattern Match</span>
          <span class="tl-score-val ${getScoreColor(visualScore)}">${scanResults && !scanResults.clipUnavailable ? visualScore + '%' : '—'}</span>
        </div>
        <div class="tl-progress-bar">
          <div class="tl-progress-fill" style="width:${scanResults && !scanResults.clipUnavailable ? visualScore : 0}%;background:${getProgressColor(scanResults && !scanResults.clipUnavailable ? visualScore : 0)}"></div>
        </div>
        ${scanResults?.clipUnavailable ? `
          <div style="font-size: 11px; color: #6B7280; font-style: italic; margin-top: 6px; text-align: center;">
            Visual analysis temporarily unavailable. Showing ICT score only.
          </div>
        ` : ''}
      </div>
    `

    // Combined score (show after scan)
    if (scanResults) {
      const rec = getRecommendation(combined, ictScore, visualScore, scanResults.matches)
      html += `
        <div class="tl-combined-box">
          <div class="tl-combined-score ${getScoreColor(combined)}">${combined}%</div>
          <div class="tl-combined-label">Combined Confidence</div>
        </div>
        <div class="tl-recommendation ${rec.cls}">${rec.text}</div>
      `

      // Visual matches
      if (scanResults.matches && scanResults.matches.length > 0) {
        html += `
          <div class="tl-section">
            <div class="tl-label">Similar Past Trades</div>
            ${scanResults.matches.slice(0, 3).map(m => {
              const sim = Math.round(m.similarity * 100)
              const pnl = m.pnl > 0 ? '+₹' + Math.abs(m.pnl).toFixed(0) : '-₹' + Math.abs(m.pnl).toFixed(0)
              const date = m.date ? new Date(m.date).toLocaleDateString('en-IN', { day:'numeric', month:'short'}) : '—'
              return `
                <div class="tl-match-card">
                  <div class="tl-match-sim ${getScoreColor(sim)}">${sim}% match</div>
                  <div class="tl-match-detail">
                    ${m.symbol || '—'} · ${date} · 
                    <span class="${m.status === 'Win' ? 'tl-win-badge' : 'tl-loss-badge'}">${m.status}</span>
                    · ${pnl}
                  </div>
                </div>
              `
            }).join('')}
          </div>
        `
      } else {
        html += `<div class="tl-empty">No similar visual patterns in library yet.<br>Add chart screenshots to trades to build your library.</div>`
      }
    }

    // Scan button
    html += `
      <button class="tl-btn tl-btn-primary" id="tl-scan-btn" ${isScanning ? 'disabled' : ''}>
        ${isScanning ? '<span class="tl-spinner"></span>Scanning...' : '⚡ Scan Visual Pattern'}
      </button>
      ${scanResults ? `<button class="tl-btn tl-btn-secondary" id="tl-reset-btn" style="margin-top:6px">↺ Reset Scan</button>` : ''}
    `
  }

  // ── FOOTER ──
  html += `
    <hr class="tl-divider">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:10px;color:#374151">Runs on your device · Zero cost</span>
      <a href="https://tradelyze.vercel.app" target="_blank" style="font-size:10px;color:#6366F1;text-decoration:none;">Open Journal →</a>
    </div>
    </div>
  `

  overlayEl.innerHTML = html
  attachOverlayEvents()
}

// ── EVENT HANDLERS ──
function attachOverlayEvents() {
  // Close button
  document.getElementById('tl-close-btn')?.addEventListener('click', () => {
    overlayEl.style.display = 'none'
    overlayVisible = false
  })

  // Auto scan toggle
  document.getElementById('tl-auto-toggle-btn')?.addEventListener('click', () => {
    autoScanEnabled = !autoScanEnabled
    if (autoScanEnabled) {
      startAutoScanScheduler()
    } else {
      if (autoScanTimeout) clearTimeout(autoScanTimeout)
      if (autoScanInterval) clearInterval(autoScanInterval)
    }
    renderOverlay()
  })

  // Strategy select
  document.getElementById('tl-strategy-select')?.addEventListener('change', async (e) => {
    selectedStrategyId = e.target.value || null
    ruleAnswers = {}
    strategyRules = []
    strategyStats = null
    scanResults = null

    if (selectedStrategyId && currentUser) {
      const [rules, stats] = await Promise.all([
        sendMsg('GET_STRATEGY_RULES', { strategyId: selectedStrategyId, userId: currentUser.id }),
        sendMsg('GET_STRATEGY_STATS', { strategyId: selectedStrategyId, userId: currentUser.id })
      ])
      strategyRules = rules || []
      strategyStats = stats || null
    }
    renderOverlay()
  })

  // Y/N rule buttons
  document.querySelectorAll('.tl-yn-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ruleId = btn.dataset.rule
      const val = btn.dataset.val === 'true'
      // Toggle off if already selected
      if (ruleAnswers[ruleId] === val) {
        ruleAnswers[ruleId] = null
      } else {
        ruleAnswers[ruleId] = val
      }
      renderOverlay()
    })
  })

  // Scan button
  document.getElementById('tl-scan-btn')?.addEventListener('click', async () => {
    if (isScanning || !currentUser) return
    isScanning = true
    scanResults = null
    renderOverlay()

    try {
      // Capture chart canvas
      const imageDataUrl = captureChartCanvas()
      if (!imageDataUrl) throw new Error('Could not capture chart. Make sure chart is visible.')

      // Generate CLIP embedding via offscreen document
      const embedding = await sendMsg('GENERATE_EMBEDDING', { imageDataUrl })
      if (!embedding || embedding.error) throw new Error('CLIP model failed: ' + (embedding?.error || 'Unknown error'))

      // Search similar trades
      const selectedStrategy = strategies.find(s => s.id === selectedStrategyId)
      const matches = await sendMsg('SEARCH_SIMILAR', {
        embedding,
        userId: currentUser.id,
        setupName: selectedStrategy?.name || null
      })

      // Calculate visual score from top match
      const topMatch = matches?.[0]
      const visualScore = topMatch ? Math.round(topMatch.similarity * 100) : 0

      scanResults = { embedding, matches: matches || [], visualScore }

      // Fire notification if score is high enough
      const combined = calcCombinedScore(calcICTScore(), visualScore)
      if (combined >= 65) {
        chrome.runtime.sendMessage({
          type: 'FIRE_NOTIFICATION',
          title: `Tradelyze: ${selectedStrategy?.name || 'Setup'} — ${combined}%`,
          body: combined >= 85 ? '⚡ High confidence setup detected!' :
                combined >= 75 ? '✓ Strong setup — Consider entry' :
                '👁 Setup forming — Monitor'
        })
      }

    } catch (err) {
      scanResults = { 
        matches: [], 
        visualScore: 0, 
        error: err.message,
        clipUnavailable: true 
      }
    }

    isScanning = false
    renderOverlay()
  })

  // Reset button
  document.getElementById('tl-reset-btn')?.addEventListener('click', () => {
    scanResults = null
    ruleAnswers = {}
    renderOverlay()
  })

  // Drag functionality
  const handle = document.getElementById('tl-drag-handle')
  if (handle) {
    handle.addEventListener('mousedown', (e) => {
      isDragging = true
      const rect = overlayEl.getBoundingClientRect()
      dragOffsetX = e.clientX - rect.left
      dragOffsetY = e.clientY - rect.top
    })
  }
}

// Global drag events
document.addEventListener('mousemove', (e) => {
  if (!isDragging || !overlayEl) return
  const x = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffsetX))
  const y = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffsetY))
  overlayEl.style.right = 'auto'
  overlayEl.style.left = x + 'px'
  overlayEl.style.top = y + 'px'
})
document.addEventListener('mouseup', () => { isDragging = false })

// ── AUTO SCAN SYSTEM ──
function getTimeframeMs() {
  const tfButton = document.querySelector(
    '[class*="timeframe"] [class*="active"], [data-value].isActive'
  )
  let tfText = '5'
  if (tfButton) {
    const raw = tfButton.textContent.trim()
    if (raw.includes('D') || raw.includes('d')) {
      tfText = 'D'
    } else {
      const match = raw.match(/\d+/)
      if (match) {
        let val = parseInt(match[0], 10)
        if (raw.toLowerCase().includes('h')) val *= 60
        tfText = String(val)
      }
    }
  } else {
    const urlMatch = window.location.href.match(/interval=([A-Z0-9]+)/i)
    if (urlMatch) {
      tfText = urlMatch[1]
    }
  }

  const TF_MS = {
    '1': 60000,
    '5': 300000,
    '15': 900000,
    '30': 1800000,
    '60': 3600000,
    '240': 14400000,
    'D': 86400000
  }
  return TF_MS[tfText] || TF_MS['5']
}

function startAutoScanScheduler() {
  if (autoScanTimeout) clearTimeout(autoScanTimeout)
  if (autoScanInterval) clearInterval(autoScanInterval)
  
  if (!autoScanEnabled) return

  const tfMs = getTimeframeMs()
  const now = Date.now()
  const nextClose = Math.ceil(now / tfMs) * tfMs
  const msUntilClose = nextClose - now

  autoScanTimeout = setTimeout(() => {
    autoScan()
    autoScanInterval = setInterval(() => {
      if (autoScanEnabled) {
        autoScan()
      }
    }, tfMs)
  }, msUntilClose)
}

async function autoScan() {
  if (!selectedStrategyId || isScanning) return
  isScanning = true
  
  // Show "Auto-scanning..." in overlay
  const indicator = document.getElementById('tl-auto-status')
  if (indicator) indicator.textContent = '⟳ Scanning...'
  
  try {
    const imageDataUrl = captureChartCanvas()
    if (!imageDataUrl) return
    
    const embedding = await sendMsg('GENERATE_EMBEDDING', { imageDataUrl })
    if (!embedding || embedding.error) return
    
    const matches = await sendMsg('SEARCH_SIMILAR', {
      embedding,
      userId: currentUser.id,
      setupName: null
    })
    
    const topMatch = matches?.[0]
    const visualScore = topMatch ? Math.round(topMatch.similarity * 100) : 0
    
    scanResults = { 
      embedding, 
      matches: matches || [], 
      visualScore,
      autoScanned: true,
      scannedAt: new Date().toLocaleTimeString('en-IN')
    }
    
    // Fire notification if score is high
    const combined = calcCombinedScore(calcICTScore(), visualScore)
    if (combined >= 65) {
      chrome.runtime.sendMessage({
        type: 'FIRE_NOTIFICATION',
        title: `Tradelyze: ${combined}% Confidence`,
        body: combined >= 85 ? '⚡ High confidence setup!' :
              '👁 Setup forming — check chart'
      })
    }
    
    renderOverlay()
  } finally {
    isScanning = false
    if (indicator) {
      indicator.textContent = `⟳ Last scan: ${new Date().toLocaleTimeString('en-IN')}`
    }
  }
}

// ── INITIALIZE ──
async function init() {
  // Check auth
  const { session, user } = await sendMsg('GET_SESSION')
  if (!session || !user) return // Not logged in, no overlay

  currentUser = user

  // Create overlay element
  overlayEl = document.createElement('div')
  overlayEl.id = 'tradelyze-overlay'
  document.body.appendChild(overlayEl)

  // Load strategies
  strategies = await sendMsg('GET_STRATEGIES', { userId: user.id })

  renderOverlay()
  startAutoScanScheduler()
}

// Wait for TradingView to fully load
setTimeout(init, 3000)

// Add toggle button to TradingView toolbar
setTimeout(() => {
  const toggleBtn = document.createElement('button')
  toggleBtn.id = 'tl-toggle'
  toggleBtn.innerHTML = '📊 TL'
  toggleBtn.style.cssText = `
    position:fixed; bottom:20px; right:20px; z-index:9998;
    background:#6366F1; color:white; border:none; border-radius:8px;
    padding:8px 14px; font-size:13px; font-weight:700;
    cursor:pointer; font-family:Inter,-apple-system,sans-serif;
    box-shadow:0 4px 20px rgba(99,102,241,0.4);
  `
  toggleBtn.addEventListener('click', () => {
    if (!overlayEl) return
    overlayVisible = !overlayVisible
    overlayEl.style.display = overlayVisible ? 'block' : 'none'
  })
  document.body.appendChild(toggleBtn)
}, 3000)
