const YAHOO_DIRECT_MAP = {
  'NSE:NIFTY':       '^NSEI',
  'NSE:NIFTY50':     '^NSEI',
  'NSE:BANKNIFTY':   '^NSEBANK',
  'NSE:FINNIFTY':    '^CNXFINANCE',
  'NSE:MIDCPNIFTY':  '^CNXMID',
  'NSE:CNXNIFTY':    '^NSEI',
  'NSE:NIFTYIT':     '^CNXIT',
  'NSE:NIFTYAUTO':   '^CNXAUTO',
  'NSE:NIFTYPHARMA': '^CNXPHARMA',
  'NSE:NIFTYFMCG':   '^CNXFMCG',
  'BSE:SENSEX':      '^BSESN',
  'BSE:BANKEX':      '^SPBSEBANKEX'
}

const TV_INTERVAL_TO_YAHOO = {
  '1':   '1m',
  '3':   '2m',
  '5':   '5m',
  '15':  '15m',
  '30':  '30m',
  '60':  '60m',
  '240': '60m',
  'D':   '1d',
  'W':   '1wk',
  'M':   '1mo'
}

export function getYahooSymbol(tvSymbol) {
  if (!tvSymbol) return null

  const upper = tvSymbol.toUpperCase().trim()

  if (YAHOO_DIRECT_MAP[upper]) {
    return YAHOO_DIRECT_MAP[upper]
  }

  if (upper.startsWith('NSE:')) {
    const ticker = upper.replace('NSE:', '')
    return ticker + '.NS'
  }

  if (upper.startsWith('BSE:')) {
    const ticker = upper.replace('BSE:', '')
    return ticker + '.BO'
  }

  return null
}

export function getYahooInterval(tvInterval) {
  return TV_INTERVAL_TO_YAHOO[tvInterval] || '5m'
}

export function canFetchIntraday(tradeDate, tvInterval) {
  if (tvInterval === 'D' || tvInterval === 'W' || tvInterval === 'M') return true

  if (!tradeDate) return true

  const trade = new Date(tradeDate + 'T00:00:00+05:30')
  const now = new Date()
  const diffDays = (now.getTime() - trade.getTime()) / (1000 * 60 * 60 * 24)

  if (tvInterval === '1') return diffDays <= 7
  if (tvInterval === '3' || tvInterval === '5' || tvInterval === '15' || tvInterval === '30') return diffDays <= 60
  if (tvInterval === '60' || tvInterval === '240') return diffDays <= 730

  return true
}
