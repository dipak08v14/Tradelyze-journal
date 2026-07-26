import dotenv from 'dotenv';
dotenv.config();

import { convertTradeAmounts } from './src/lib/currencyConversion.js';
import handler from './api/get-exchange-rate.js';

// Mock fetch to provide hardcoded rates for testing the conversion math
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  const urlStr = url.toString();
  if (urlStr.includes('/api/get-exchange-rate')) {
    const urlObj = new URL(urlStr);
    const date = urlObj.searchParams.get('date');
    const from = urlObj.searchParams.get('from');
    
    let rate = 94.56;
    if (date === '2026-06-14') rate = 95.12; // Simulate Frankfurter weekend substitution
    
    return {
      ok: true,
      status: 200,
      json: async () => ({ rate, cached: true })
    } as any;
  }
  return originalFetch(url, options);
};

async function runTest() {
  const fakeTrades = [
    {
      id: 1,
      currency: 'USD',
      date: '2026-06-16',
      pnl: 100, // Should become ~9456
      fees: 5,
      profit_target: 1.1500, // Should remain untouched
      symbol: 'EURUSD'
    },
    {
      id: 2,
      currency: 'INR',
      date: '2026-06-16',
      pnl: 5000, // Already in target, should remain 5000
      fees: 50,
      symbol: 'NIFTY'
    },
    {
      id: 3,
      currency: 'USD',
      date: '2026-06-14', // Weekend, Frankfurter should substitute internally
      pnl: 50, // Should become ~4756
      fees: 2,
      symbol: 'XAUUSD'
    }
  ];

  console.log("=== BEFORE CONVERSION ===");
  console.log(JSON.stringify(fakeTrades, null, 2));

  // Convert all to INR
  const converted = await convertTradeAmounts(fakeTrades, 'INR');

  console.log("\\n=== AFTER CONVERSION TO INR ===");
  console.log(JSON.stringify(converted, null, 2));
}

runTest().catch(console.error);
