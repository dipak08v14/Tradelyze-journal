export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { symbol, interval, from, to } = req.query

  if (!symbol) return res.status(400).json({ error: 'symbol parameter is required' })

  const yahooInterval = interval || '5m'
  const nowSeconds = Math.floor(Date.now() / 1000)

  const rangeMap = {
    '1m':  '7d',
    '2m':  '60d',
    '5m':  '60d',
    '15m': '60d',
    '30m': '60d',
    '60m': '730d',
    '1h':  '730d',
    '1d':  '5y'
  }
  const defaultRange = rangeMap[yahooInterval] || '5d'

  const fromNum = from ? parseInt(from, 10) : null
  const toNum = to ? parseInt(to, 10) : null

  const validFrom = fromNum && !isNaN(fromNum) && fromNum > 0 && fromNum < nowSeconds
  const validTo = toNum && !isNaN(toNum) && toNum > 0

  const cappedTo = validTo ? Math.min(toNum, nowSeconds) : nowSeconds

  const useSpecificDates = validFrom && validFrom < cappedTo

  const buildUrl = (useRange) => {
    const base = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol)
    if (!useRange && useSpecificDates) {
      return base + '?interval=' + yahooInterval + '&period1=' + fromNum + '&period2=' + cappedTo
    }
    return base + '?interval=' + yahooInterval + '&range=' + defaultRange
  }

  const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9'
  }

  const parseCandles = (data) => {
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const timestamps = result.timestamp || []
    const quote = result.indicators?.quote?.[0] || {}
    const candles = []
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open?.[i] != null && quote.high?.[i] != null && quote.low?.[i] != null && quote.close?.[i] != null) {
        candles.push({
          time: timestamps[i],
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume?.[i] || 0
        })
      }
    }
    return candles.length > 0 ? candles : null
  }

  try {
    let yahooUrl = buildUrl(false)
    let response = await fetch(yahooUrl, { headers: fetchHeaders })
    let data = await response.json()
    let candles = response.ok ? parseCandles(data) : null

    if (!candles) {
      yahooUrl = buildUrl(true)
      response = await fetch(yahooUrl, { headers: fetchHeaders })
      if (!response.ok) {
        return res.status(response.status).json({
          error: 'Yahoo Finance returned status ' + response.status + ' for ' + symbol,
          hint: 'Check if the symbol is valid on Yahoo Finance'
        })
      }
      data = await response.json()
      candles = parseCandles(data)
    }

    if (!candles) {
      return res.status(404).json({
        error: 'No valid candle data found for ' + symbol,
        note: 'Intraday data may not be available. Try selecting the D (daily) timeframe.'
      })
    }

    return res.status(200).json({
      symbol,
      interval: yahooInterval,
      candles,
      count: candles.length,
      from: candles[0].time,
      to: candles[candles.length - 1].time
    })

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch chart data: ' + err.message, symbol })
  }
}
