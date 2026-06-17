export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { symbol, interval, from, to } = req.query

  if (!symbol) {
    return res.status(400).json({ error: 'symbol parameter is required' })
  }

  const yahooInterval = interval || '5m'

  let yahooUrl
  if (from && to) {
    yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(symbol) +
      '?interval=' + yahooInterval +
      '&period1=' + from +
      '&period2=' + to
  } else {
    const rangeMap = {
      '1m': '5d',
      '2m': '5d',
      '5m': '5d',
      '15m': '1mo',
      '30m': '1mo',
      '60m': '3mo',
      '1h': '3mo',
      '1d': '1y'
    }
    const range = rangeMap[yahooInterval] || '5d'
    yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(symbol) +
      '?interval=' + yahooInterval +
      '&range=' + range
  }

  try {
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Yahoo Finance returned status ' + response.status,
        symbol: symbol
      })
    }

    const data = await response.json()

    const result = data?.chart?.result?.[0]
    if (!result) {
      return res.status(404).json({
        error: 'No chart data found for symbol: ' + symbol,
        yahooUrl: yahooUrl
      })
    }

    const timestamps = result.timestamp || []
    const quote = result.indicators?.quote?.[0] || {}
    const opens = quote.open || []
    const highs = quote.high || []
    const lows = quote.low || []
    const closes = quote.close || []
    const volumes = quote.volume || []

    const candles = []
    for (let i = 0; i < timestamps.length; i++) {
      if (
        opens[i] != null &&
        highs[i] != null &&
        lows[i] != null &&
        closes[i] != null
      ) {
        candles.push({
          time: timestamps[i],
          open: opens[i],
          high: highs[i],
          low: lows[i],
          close: closes[i],
          volume: volumes[i] || 0
        })
      }
    }

    if (candles.length === 0) {
      return res.status(404).json({
        error: 'No valid candle data returned. The date may be too old for intraday intervals.',
        symbol: symbol,
        note: 'Yahoo Finance only provides intraday (1m-30m) data for the last 60 days. Use interval=1d for older dates.'
      })
    }

    return res.status(200).json({
      symbol: symbol,
      interval: yahooInterval,
      candles: candles,
      count: candles.length,
      from: timestamps[0],
      to: timestamps[timestamps.length - 1]
    })

  } catch (err) {
    return res.status(500).json({
      error: 'Failed to fetch chart data: ' + err.message,
      symbol: symbol
    })
  }
}
