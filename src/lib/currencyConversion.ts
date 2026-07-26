/**
 * src/lib/currencyConversion.ts
 * Shared utility for handling multi-currency trade data.
 */

// Define the fields in a trade that represent monetary values (in account currency)
// Note: Fields like 'stop_loss_price' and 'profit_target' are asset prices, not monetary account values, so they are excluded.
const MONETARY_FIELDS = [
  'pnl',
  'investment',
  'risk',
  'fees',
  'max_drawdown',
  'mae',
  'mfe',
  'potential_pnl'
];

/**
 * Converts an array of trades to the target display currency.
 * Trades must have 'currency' and 'date' fields.
 * 
 * @param trades - Array of trade objects.
 * @param targetCurrency - The currency to convert everything to (e.g., 'INR').
 * @returns Array of converted trades.
 */
export async function convertTradeAmounts(trades: any[], targetCurrency: string) {
  if (!trades || trades.length === 0) return [];
  
  const target = targetCurrency.toUpperCase().trim();
  
  // 1. Figure out unique (currency, date) combinations needed
  const ratesNeeded = new Map<string, { date: string, from: string }>(); 
  
  trades.forEach(trade => {
    // If trade doesn't have a currency, assume it's already in the target currency (or base INR)
    const fromCurrency = (trade.currency || 'INR').toUpperCase().trim();
    const tradeDate = trade.date;
    
    if (fromCurrency !== target && tradeDate) {
      const key = `${fromCurrency}_${tradeDate}`;
      if (!ratesNeeded.has(key)) {
        ratesNeeded.set(key, { date: tradeDate, from: fromCurrency });
      }
    }
  });

  // 2. Fetch all unique rates in parallel
  const rateMap = new Map<string, number>();
  const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3010';
  
  const fetchPromises = Array.from(ratesNeeded.values()).map(async ({ date, from }) => {
    try {
      const res = await fetch(`${baseUrl}/api/get-exchange-rate?date=${date}&from=${from}&to=${target}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data && data.rate) {
        rateMap.set(`${from}_${date}`, data.rate);
      }
    } catch (err) {
      console.error(`Failed to fetch rate for ${from} to ${target} on ${date}:`, err);
    }
  });

  await Promise.all(fetchPromises);

  // 3. Apply the correct rate to each trade's money fields
  const convertedTrades = trades.map(trade => {
    const fromCurrency = (trade.currency || 'INR').toUpperCase().trim();
    
    // No conversion needed if same currency
    if (fromCurrency === target) {
      return { ...trade, _converted: false };
    }
    
    const tradeDate = trade.date;
    const rate = rateMap.get(`${fromCurrency}_${tradeDate}`);
    
    // If rate fetch failed or missing date, keep original values but mark as failed conversion
    if (!rate) {
      return { ...trade, _converted: false, _conversion_failed: true };
    }
    
    // Create a new trade object to avoid mutating the original
    const newTrade = { ...trade, _converted: true, _conversion_rate: rate };
    
    // Apply conversion to all known monetary fields
    MONETARY_FIELDS.forEach(field => {
      if (typeof newTrade[field] === 'number') {
        newTrade[field] = newTrade[field] * rate;
      }
    });
    
    // Update the currency field to reflect it's now converted
    newTrade.currency = target;
    
    return newTrade;
  });

  return convertedTrades;
}
