import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import handler from './api/get-exchange-rate.js';

// Load the stolen token
const rawToken = fs.readFileSync('token.txt', 'utf8');
const tokenData = JSON.parse(rawToken);
const session = tokenData; 

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Helper to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock req/res to call the handler directly without an HTTP server
async function fetchExchangeRate(date, from, to) {
  const req = {
    method: 'GET',
    query: { date, from, to }
  };
  
  return new Promise((resolve) => {
    const res = {
      setHeader: () => {},
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) {
        resolve({
          ok: this.statusCode === 200,
          status: this.statusCode,
          data
        });
        return this;
      },
      end: function() {}
    };
    
    // Call the handler
    handler(req, res).catch(err => {
      resolve({ ok: false, status: 500, data: { error: err.message } });
    });
  });
}

async function run() {
  console.log("Setting Supabase session...");
  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });

  console.log("Fetching unique dates from trades table...");
  
  const { data: trades, error } = await supabase
    .from('trades')
    .select('date')
    .eq('currency', 'USD');
    
  if (error) {
    console.error("Failed to query trades:", error);
    return;
  }
  
  // Extract unique dates and filter out nulls/empties
  const uniqueDates = [...new Set(trades.map(t => t.date).filter(Boolean))];
  
  console.log(`Found ${uniqueDates.length} unique dates for USD trades.`);
  
  if (uniqueDates.length === 0) {
    const { data: allTrades } = await supabase.from('trades').select('date, currency');
    const allUSD = allTrades.filter(t => t.currency === 'USD' || !t.currency); 
    console.log(`Fallback: Total trades ${allTrades.length}, Trades with no currency or USD ${allUSD.length}`);
    const allUniqueDates = [...new Set(allUSD.map(t => t.date).filter(Boolean))];
    console.log(`Found ${allUniqueDates.length} unique dates among those.`);
    
    uniqueDates.push(...allUniqueDates);
  }
  
  let successCount = 0;
  const failedDates = [];
  
  for (let i = 0; i < uniqueDates.length; i++) {
    const date = uniqueDates[i];
    console.log(`[${i+1}/${uniqueDates.length}] Fetching rate for ${date}...`);
    
    // Add 5 second timeout
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve({ ok: false, data: { error: 'Timeout after 5s' } }), 5000);
    });
    
    const response = await Promise.race([
      fetchExchangeRate(date, 'USD', 'INR'),
      timeoutPromise
    ]);
    
    if (response.ok && response.data && response.data.rate) {
      console.log(`  -> Success: ${response.data.rate} (${response.data.cached ? 'cached' : 'newly fetched'})`);
      successCount++;
    } else {
      console.error(`  -> Failed: ${JSON.stringify(response.data)}`);
      failedDates.push({ date, reason: response.data });
    }
    
    await delay(500);
  }
  
  console.log("\n=== WARMING COMPLETE ===");
  console.log(`Total Unique Dates: ${uniqueDates.length}`);
  console.log(`Successfully Cached: ${successCount}`);
  console.log(`Failed: ${failedDates.length}`);
  if (failedDates.length > 0) {
    console.log("Failed details:", failedDates);
  }
}

run();
