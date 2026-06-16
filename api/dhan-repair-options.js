import { createClient } from '@supabase/supabase-js';

function getOptionType(leg) {
  if (!leg) return null;
  const raw = leg.raw_response || leg;
  
  // Method 1: Check drvOptionType field directly
  // Dhan may return 'CE', 'PE', 'CALL', 'PUT', null, or the string 'NA'
  if (raw.drvOptionType === 'CE') return 'CALL';
  if (raw.drvOptionType === 'PE') return 'PUT';
  if (raw.drvOptionType === 'CALL') return 'CALL';
  if (raw.drvOptionType === 'PUT') return 'PUT';

  // Method 2: Parse from tradingSymbol (NSE format ends with CE or PE)
  // Example: 'NIFTY2407225050CE' or 'BANKNIFTY2406456000PE'
  const tradingSymbol = (raw.tradingSymbol || leg.symbol || '').toUpperCase().trim();
  if (tradingSymbol.endsWith('CE')) return 'CALL';
  if (tradingSymbol.endsWith('PE')) return 'PUT';

  // Method 3: Parse from customSymbol (human-readable, contains the word CALL or PUT)
  // Example: 'NIFTY 24 JUL 25050 CALL' or 'BANKNIFTY 17 JUL 56000 PUT'
  const customSymbol = (raw.customSymbol || '').toUpperCase().trim();
  if (customSymbol.includes(' CALL') || customSymbol.endsWith('CALL')) return 'CALL';
  if (customSymbol.includes(' PUT') || customSymbol.endsWith('PUT')) return 'PUT';

  // Not an options trade (equity, futures, currency)
  return null;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.replace('Bearer ', '');

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: User lookup failed' });
    }

    // Query all trades where user_id = user.id AND sync_source = 'dhan' AND option_type IS NULL
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('id, user_id, broker_ticket, option_type, direction')
      .eq('user_id', user.id)
      .eq('sync_source', 'dhan')
      .is('option_type', null);

    if (tradesError) {
      return res.status(500).json({ error: 'Failed to query trades', detail: tradesError.message });
    }

    let tradesOptionTypeFixed = 0;
    let tradesDirectionFixed = 0;

    if (trades && trades.length > 0) {
      for (const trade of trades) {
        const brokerTicket = trade.broker_ticket || '';
        if (!brokerTicket.startsWith('DHAN_')) continue;
        const orderId = brokerTicket.replace('DHAN_', '');

        const { data: legs, error: legsError } = await supabase
          .from('dhan_raw_legs')
          .select('*')
          .eq('dhan_order_id', orderId)
          .eq('user_id', user.id)
          .limit(1);

        if (legsError || !legs || legs.length === 0) continue;
        const leg = legs[0];
        const optionType = getOptionType(leg);
        
        if (optionType) {
          // Determine the opening transactionType from raw_response (or fallback to leg parameter)
          const rawResponse = leg.raw_response || {};
          const rawLegTxType = (rawResponse.transactionType || leg.transaction_type || '').toUpperCase().trim();
          
          let newDirection = trade.direction;
          if (optionType === 'PUT') {
            newDirection = (rawLegTxType === 'BUY') ? 'SHORT' : 'LONG';
          } else if (optionType === 'CALL') {
            newDirection = (rawLegTxType === 'BUY') ? 'LONG' : 'SHORT';
          }

          const { error: updateError } = await supabase
            .from('trades')
            .update({ 
              option_type: optionType,
              direction: newDirection
            })
            .eq('id', trade.id);

          if (!updateError) {
            tradesOptionTypeFixed++;
            if (newDirection !== trade.direction) {
              tradesDirectionFixed++;
            }
          }
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      trades_option_type_fixed: tradesOptionTypeFixed, 
      trades_direction_fixed: tradesDirectionFixed 
    });

  } catch (err) {
    console.error('Unexpected error in dhan-repair-options API:', err);
    return res.status(500).json({ error: 'Unexpected server error: ' + err.message });
  }
}
