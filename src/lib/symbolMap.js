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
  NATURALGAS_MCX: 'MCX:NATURALGAS1!'
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
  if (cleaned.endsWith('.I#')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  } else if (cleaned.endsWith('.I')) {
    cleaned = cleaned.substring(0, cleaned.length - 2);
  } else if (cleaned.endsWith('#')) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }

  if (cleaned !== upper && SYMBOL_MAP[cleaned]) {
    return SYMBOL_MAP[cleaned];
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

export function buildTVWidgetURL(symbol, interval, tvTheme) {
  const baseURL = 'https://in.tradingview.com/widgetembed/';
  const params = new URLSearchParams({
    symbol: symbol,
    interval: interval,
    timezone: 'Asia/Kolkata',
    theme: tvTheme,
    style: '1',
    locale: 'en',
    enable_publishing: 'false',
    hide_top_toolbar: 'false',
    hide_legend: 'false',
    save_image: 'false',
    hide_volume: 'false',
    support_host: 'https://www.tradingview.com'
  });
  return baseURL + '?' + params.toString();
}
