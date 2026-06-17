export const SYMBOL_MAP = {
  'XAUUSD': 'OANDA:XAUUSD',
  'XAGUSD': 'OANDA:XAGUSD',
  'GOLD': 'OANDA:XAUUSD',
  'EURUSD': 'OANDA:EURUSD',
  'GBPUSD': 'OANDA:GBPUSD',
  'USDJPY': 'OANDA:USDJPY',
  'AUDUSD': 'OANDA:AUDUSD',
  'USDCAD': 'OANDA:USDCAD',
  'USDCHF': 'OANDA:USDCHF',
  'NZDUSD': 'OANDA:NZDUSD',
  'BTCUSD': 'BINANCE:BTCUSDT',
  'BTCUSDT': 'BINANCE:BTCUSDT',
  'ETHUSD': 'BINANCE:ETHUSDT',
  'ETHUSDT': 'BINANCE:ETHUSDT',
  'US30': 'FOREXCOM:US30',
  'NAS100': 'FOREXCOM:NAS100',
  'SPX500': 'FOREXCOM:SPX500',
  'US500': 'FOREXCOM:SPX500',
  'NIFTY': 'NSE:NIFTY',
  'NIFTY50': 'NSE:NIFTY',
  'BANKNIFTY': 'NSE:BANKNIFTY',
  'FINNIFTY': 'NSE:FINNIFTY',
  'SENSEX': 'BSE:SENSEX',
  'GOLD_MCX': 'MCX:GOLD1!',
  'SILVER_MCX': 'MCX:SILVER1!',
  'CRUDE_MCX': 'MCX:CRUDEOIL1!'
};

export function getTVSymbol(symbol) {
  if (!symbol) return '';
  const uppercasedSymbol = symbol.toUpperCase().trim();
  if (SYMBOL_MAP[uppercasedSymbol]) {
    return SYMBOL_MAP[uppercasedSymbol];
  }
  if (uppercasedSymbol.length <= 20 && !uppercasedSymbol.includes('/')) {
    return 'NSE:' + uppercasedSymbol;
  }
  return uppercasedSymbol;
}

export function getTVTheme(userThemeId) {
  if (userThemeId === 'charcoal' || userThemeId === 'navy' || userThemeId === 'midnight') {
    return 'dark';
  }
  return 'light';
}

export function buildTVWidgetURL(symbol, interval, tvTheme) {
  const baseURL = 'https://www.tradingview.com/widgetembed/';
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
