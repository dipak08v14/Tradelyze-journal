import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let date, from, to;

  if (req.method === 'GET') {
    date = req.query.date;
    from = req.query.from;
    to = req.query.to;
  } else {
    let body = {};
    if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body); } catch (e) {}
    } else if (req.body) {
      body = req.body;
    }
    date = body.date || req.query?.date;
    from = body.from || req.query?.from;
    to = body.to || req.query?.to;
  }

  if (!date || !from || !to) {
    return res.status(400).json({ error: 'Missing required parameters: date, from, to' });
  }

  // Defensive slice to ensure date is YYYY-MM-DD even if a raw timestamp is passed
  if (typeof date === 'string' && date.includes('T')) {
    date = date.split('T')[0];
  }

  from = from.toUpperCase().trim();
  to = to.toUpperCase().trim();

  // 2. If from === to, return rate = 1 immediately without any lookup
  if (from === to) {
    return res.status(200).json({ rate: 1 });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase credentials not configured on server' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 3. Check the "exchange_rates" table first
    const { data: cachedRate, error: cacheError } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('rate_date', date)
      .eq('from_currency', from)
      .eq('to_currency', to)
      .maybeSingle();

    if (cacheError) {
      console.error("Cache lookup error:", cacheError);
    }

    if (cachedRate && cachedRate.rate) {
      return res.status(200).json({ rate: cachedRate.rate, cached: true });
    }

    // 4. Fetch from Frankfurter with retry logic
    const apiUrl = `https://api.frankfurter.dev/v1/${date}?base=${from}&symbols=${to}`;
    
    let frankfurterRes;
    let retries = 2;
    let delay = 1000; // 1 second initial delay
    
    while (true) {
      try {
        frankfurterRes = await fetch(apiUrl);
        if (frankfurterRes.ok) break; // Success
        
        // If not ok, it might be a 522 or other error
        if (retries === 0) {
          const errText = await frankfurterRes.text();
          return res.status(frankfurterRes.status).json({ error: `Frankfurter API error: ${errText}` });
        }
      } catch (err) {
        // Network timeout/failure
        if (retries === 0) {
          return res.status(500).json({ error: `Frankfurter API network error: ${err.message}` });
        }
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      retries--;
      delay = 2000; // 2 seconds for next retry
    }

    const data = await frankfurterRes.json();
    
    // 5. Handle substituted dates automatically (the rate will be under data.rates[to])
    const rate = data.rates?.[to];
    if (rate === undefined || rate === null) {
      return res.status(404).json({ error: `Rate for ${to} not found in Frankfurter response.` });
    }

    // 6. Store the fetched rate in the exchange_rates table using the REQUESTED date
    const { error: insertError } = await supabase.from('exchange_rates').insert({
      rate_date: date,
      from_currency: from,
      to_currency: to,
      rate: rate
    });
    
    if (insertError) {
      console.error("Failed to cache rate:", insertError);
    }

    // 7. Return the rate
    return res.status(200).json({ rate: rate, cached: false });

  } catch (err) {
    console.error("Exchange rate endpoint error:", err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
