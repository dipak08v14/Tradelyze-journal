import dotenv from 'dotenv';
dotenv.config();

import handler from './api/get-exchange-rate.js';

// Mock req/res to call the handler directly
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
        resolve({ ok: this.statusCode === 200, status: this.statusCode, data });
        return this;
      },
      end: function() {}
    };
    
    handler(req, res).catch(err => {
      resolve({ ok: false, status: 500, data: { error: err.message } });
    });
  });
}

const failedDates = [
  '2026-03-02', '2026-03-03', '2026-02-27', '2026-02-23', 
  '2026-02-25', '2026-02-26', '2026-01-30', '2026-06-23'
];

async function run() {
  console.log("Retrying the 8 failed dates...");
  let successCount = 0;
  
  for (let i = 0; i < failedDates.length; i++) {
    const date = failedDates[i];
    console.log(`[${i+1}/${failedDates.length}] Fetching rate for ${date}...`);
    
    // The handler now has built-in retry logic (takes up to ~3 seconds max if failing)
    const response = await fetchExchangeRate(date, 'USD', 'INR');
    
    if (response.ok && response.data && response.data.rate) {
      console.log(`  -> Success: ${response.data.rate} (${response.data.cached ? 'cached' : 'newly fetched'})`);
      successCount++;
    } else {
      console.error(`  -> Failed again: ${JSON.stringify(response.data)}`);
    }
  }
  
  console.log("\n=== RETRY COMPLETE ===");
  console.log(`Successfully Cached: ${successCount} / ${failedDates.length}`);
}

run();
