import dotenv from 'dotenv';
dotenv.config();

import handler from './api/get-exchange-rate.js';

async function test() {
  const req = {
    method: 'GET',
    query: {
      date: '2026-06-16',
      from: 'USD',
      to: 'INR'
    }
  };
  
  const res = {
    setHeader: () => {},
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log('Status:', this.statusCode);
      console.log('JSON:', JSON.stringify(data, null, 2));
      return this;
    },
    end: function() {}
  };

  console.log("--- FIRST CALL (SHOULD FETCH) ---");
  await handler(req, res);
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // wait for insert
  
  console.log("\\n--- SECOND CALL (SHOULD CACHE) ---");
  await handler(req, res);
}

test().catch(console.error);
