export const SYMBOL_MAP = {
  // Gold and Silver (international spot — OANDA)
  XAUUSD: 'OANDA:XAUUSD',
  XAGUSD: 'OANDA:XAGUSD',
  GOLD: 'OANDA:XAUUSD',
  SILVER: 'OANDA:XAGUSD',

  // XM Global MT5 broker Gold variants
  'GOLD.I#': 'OANDA:XAUUSD',
  'GOLD.I': 'OANDA:XAUUSD',
  'XAUUSD#': 'OANDA:XAUUSD',
  'XAGUSD#': 'OANDA:XAGUSD',
  'SILVER.I#': 'OANDA:XAGUSD',
  'SILVER.I': 'OANDA:XAGUSD',

  // Major Forex pairs (OANDA)
  EURUSD: 'OANDA:EURUSD',
  GBPUSD: 'OANDA:GBPUSD',
  USDJPY: 'OANDA:USDJPY',
  AUDUSD: 'OANDA:AUDUSD',
  USDCAD: 'OANDA:USDCAD',
  USDCHF: 'OANDA:USDCHF',
  NZDUSD: 'OANDA:NZDUSD',
  GBPJPY: 'OANDA:GBPJPY',
  EURJPY: 'OANDA:EURJPY',
  EURGBP: 'OANDA:EURGBP',

  // Forex pairs with MT5 broker hash suffix
  'EURUSD#': 'OANDA:EURUSD',
  'GBPUSD#': 'OANDA:GBPUSD',
  'USDJPY#': 'OANDA:USDJPY',
  'AUDUSD#': 'OANDA:AUDUSD',
  'USDCAD#': 'OANDA:USDCAD',
  'USDCHF#': 'OANDA:USDCHF',
  'NZDUSD#': 'OANDA:NZDUSD',
  'GBPJPY#': 'OANDA:GBPJPY',
  'EURJPY#': 'OANDA:EURJPY',
  'EURGBP#': 'OANDA:EURGBP',

  // Crypto (Binance)
  BTCUSD: 'BINANCE:BTCUSDT',
  BTCUSDT: 'BINANCE:BTCUSDT',
  ETHUSD: 'BINANCE:ETHUSDT',
  ETHUSDT: 'BINANCE:ETHUSDT',
  LTCUSD: 'BINANCE:LTCUSDT',
  XRPUSD: 'BINANCE:XRPUSDT',
  BNBUSD: 'BINANCE:BNBUSDT',
  SOLUSD: 'BINANCE:SOLUSDT',

  // Crypto with MT5 broker hash suffix
  'BTCUSD#': 'BINANCE:BTCUSDT',
  'BTCUSDT#': 'BINANCE:BTCUSDT',
  'ETHUSD#': 'BINANCE:ETHUSDT',
  'ETHUSDT#': 'BINANCE:ETHUSDT',
  'LTCUSD#': 'BINANCE:LTCUSDT',
  'XRPUSD#': 'BINANCE:XRPUSDT',

  // US Indices (FOREXCOM)
  US30: 'FOREXCOM:US30',
  NAS100: 'FOREXCOM:NAS100',
  SPX500: 'FOREXCOM:SPX500',
  US500: 'FOREXCOM:SPX500',
  UK100: 'FOREXCOM:UK100',
  GER40: 'FOREXCOM:GER40',
  'US30#': 'FOREXCOM:US30',
  'NAS100#': 'FOREXCOM:NAS100',
  'SPX500#': 'FOREXCOM:SPX500',

  // Indian Indices (NSE/BSE)
  NIFTY: 'NSE:NIFTY',
  NIFTY50: 'NSE:NIFTY',
  BANKNIFTY: 'NSE:BANKNIFTY',
  FINNIFTY: 'NSE:FINNIFTY',
  MIDCPNIFTY: 'NSE:MIDCPNIFTY',
  SENSEX: 'BSE:SENSEX',
  'NIFTY#': 'NSE:NIFTY',
  'BANKNIFTY#': 'NSE:BANKNIFTY',
  'FINNIFTY#': 'NSE:FINNIFTY',
  'SENSEX#': 'BSE:SENSEX',

  // MCX Commodities
  GOLD_MCX: 'MCX:GOLD1!',
  SILVER_MCX: 'MCX:SILVER1!',
  CRUDE_MCX: 'MCX:CRUDEOIL1!',
  CRUDEOIL_MCX: 'MCX:CRUDEOIL1!',
  NATURALGAS_MCX: 'MCX:NATURALGAS1!',

  // Exness broker (m suffix — micro/standard accounts)
  XAUUSDM: 'OANDA:XAUUSD',
  XAGUSDM: 'OANDA:XAGUSD',
  EURUSDM: 'OANDA:EURUSD',
  GBPUSDM: 'OANDA:GBPUSD',
  USDJPYM: 'OANDA:USDJPY',
  AUDUSDM: 'OANDA:AUDUSD',
  USDCADM: 'OANDA:USDCAD',
  USDCHFM: 'OANDA:USDCHF',
  NZDUSDM: 'OANDA:NZDUSD',
  BTCUSDM: 'BINANCE:BTCUSDT',
  ETHUSDM: 'BINANCE:ETHUSDT',
  US30M: 'FOREXCOM:US30',
  NAS100M: 'FOREXCOM:NAS100',
  SPX500M: 'FOREXCOM:SPX500',

  // Pepperstone broker (.cx suffix)
  'XAUUSD.CX': 'OANDA:XAUUSD',
  'XAGUSD.CX': 'OANDA:XAGUSD',
  'EURUSD.CX': 'OANDA:EURUSD',
  'GBPUSD.CX': 'OANDA:GBPUSD',
  'USDJPY.CX': 'OANDA:USDJPY',
  'AUDUSD.CX': 'OANDA:AUDUSD',
  'BTCUSD.CX': 'BINANCE:BTCUSDT',
  'US30.CX': 'FOREXCOM:US30',
  'NAS100.CX': 'FOREXCOM:NAS100',

  // Various brokers (.raw, .stp, .pro, .min suffixes)
  'XAUUSD.RAW': 'OANDA:XAUUSD',
  'XAUUSD.STP': 'OANDA:XAUUSD',
  'XAUUSD.PRO': 'OANDA:XAUUSD',
  'EURUSD.RAW': 'OANDA:EURUSD',
  'EURUSD.STP': 'OANDA:EURUSD',
  'EURUSD.PRO': 'OANDA:EURUSD',
  'GBPUSD.RAW': 'OANDA:GBPUSD',
  'BTCUSD.RAW': 'BINANCE:BTCUSDT',

  // RoboForex (x suffix)
  XAUUSDX: 'OANDA:XAUUSD',
  EURUSDX: 'OANDA:EURUSD',
  GBPUSDX: 'OANDA:GBPUSD',
  BTCUSDX: 'BINANCE:BTCUSDT',

  // Deriv broker (frx prefix — forex instruments)
  FRXXAUUSD: 'OANDA:XAUUSD',
  FRXEURUSD: 'OANDA:EURUSD',
  FRXGBPUSD: 'OANDA:GBPUSD',
  FRXUSDJPY: 'OANDA:USDJPY',
  FRXAUDUSD: 'OANDA:AUDUSD',
  FRXUSDCAD: 'OANDA:USDCAD',
  FRXUSDCHF: 'OANDA:USDCHF',
  FRXNZDUSD: 'OANDA:NZDUSD',
  FRXBTCUSD: 'BINANCE:BTCUSDT'
};

export function getTVSymbol(symbol) {
  if (!symbol || !symbol.trim()) {
    return 'OANDA:XAUUSD';
  }

  // Step 1: Convert to uppercase and trim
  const upper = symbol.toUpperCase().trim();

  // Step 2: Try direct lookup in SYMBOL_MAP
  if (SYMBOL_MAP[upper]) {
    return SYMBOL_MAP[upper];
  }

  // Step 3: Try suffix stripping
  let cleaned = upper;

  // Transformation 1 — Strip dot-extensions (handles .cx, .raw, .stp, .pro, .mini, .micro, .I#, .I)
  if (cleaned.endsWith('.I#')) {
    const candidate = cleaned.substring(0, cleaned.length - 3);
    if (SYMBOL_MAP[candidate]) {
      return SYMBOL_MAP[candidate];
    }
  }

  const lastDotIndex = cleaned.lastIndexOf('.');
  if (lastDotIndex !== -1) {
    const ext = cleaned.substring(lastDotIndex + 1).toUpperCase();
    const validExtensions = ['CX', 'RAW', 'STP', 'PRO', 'MINI', 'MICRO', 'I'];
    if (validExtensions.includes(ext)) {
      const candidate = cleaned.substring(0, lastDotIndex);
      if (SYMBOL_MAP[candidate]) {
        return SYMBOL_MAP[candidate];
      }
    }
  }

  // Transformation 2 — Strip single trailing # character
  if (cleaned.endsWith('#')) {
    const candidate = cleaned.substring(0, cleaned.length - 1);
    if (SYMBOL_MAP[candidate]) {
      return SYMBOL_MAP[candidate];
    }
  }

  // Transformation 3 — Strip single trailing x character (RoboForex x suffix)
  if (cleaned.endsWith('X')) {
    const candidate = cleaned.substring(0, cleaned.length - 1);
    if (candidate.length >= 6 && SYMBOL_MAP[candidate]) {
      return SYMBOL_MAP[candidate];
    }
  }

  // Transformation 4 — Strip trailing m character (Exness m suffix)
  if (cleaned.endsWith('M')) {
    const candidate = cleaned.substring(0, cleaned.length - 1);
    if (candidate.length >= 6 && SYMBOL_MAP[candidate]) {
      return SYMBOL_MAP[candidate];
    }
  }

  // Transformation 5 — Strip frx prefix (Deriv)
  if (cleaned.startsWith('FRX')) {
    const candidate = cleaned.substring(3);
    if (SYMBOL_MAP[candidate]) {
      return SYMBOL_MAP[candidate];
    }
  }

  // Step 4: Prepend NSE: if short symbol with no slash
  if (upper.length <= 20 && !upper.includes('/')) {
    return 'NSE:' + upper;
  }

  // Step 5: Return upper as-is
  return upper;
}

export function getTVTheme(userThemeId) {
  if (userThemeId === 'charcoal' || userThemeId === 'navy' || userThemeId === 'midnight') {
    return 'dark';
  }
  return 'light';
}

export function buildTVWidgetURL(symbol, interval, tvTheme, fromTimestamp, toTimestamp) {
  const base = 'https://s.tradingview.com/widgetembed/'

  const entries = [
    ['symbol', symbol],
    ['interval', String(interval)],
    ['timezone', 'Asia/Kolkata'],
    ['theme', tvTheme],
    ['style', '1'],
    ['locale', 'en'],
    ['enable_publishing', 'false'],
    ['hide_top_toolbar', 'false'],
    ['hide_side_toolbar', 'false'],
    ['hide_legend', 'false'],
    ['save_image', 'true'],
    ['hide_volume', 'false'],
    ['support_host', 'https://www.tradingview.com']
  ]

  if (fromTimestamp && typeof fromTimestamp === 'number' && fromTimestamp > 0 && !isNaN(fromTimestamp)) {
    entries.push(['from', String(Math.round(fromTimestamp))])
  }
  if (toTimestamp && typeof toTimestamp === 'number' && toTimestamp > 0 && !isNaN(toTimestamp)) {
    entries.push(['to', String(Math.round(toTimestamp))])
  }

  const qs = entries.map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&')
  return base + '?' + qs
}
