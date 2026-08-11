import { createClient } from '@supabase/supabase-js'

function readRawBody(req) {
  return new Promise((resolve) => {
    try {
      let chunks = []
      req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', () => resolve(Buffer.alloc(0)))
    } catch (e) {
      resolve(Buffer.alloc(0))
    }
  })
}

function cleanAndParse(text) {
  let t = text
    .replace(/^\uFEFF/, '')
    .replace(/\x00/g, '')
    .replace(/[\x00-\x08\x0B\x0E-\x1F\x7F]/g, '')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .trim()

  try { return JSON.parse(t) } catch (e1) {
    const last = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'))
    if (last > 0) {
      const trimmed = t.substring(0, last + 1)
      try { return JSON.parse(trimmed) } catch (e2) {
        try { return JSON.parse(trimmed + '}') } catch (e3) {
          throw e1
        }
      }
    }
    throw e1
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = {}

  try {
    let rb = null
    try { rb = req.body } catch (e) { rb = null }

    if (rb && typeof rb === 'object' && !Buffer.isBuffer(rb)) {
      body = rb
    } else {
      const raw = await readRawBody(req)
      const text = raw.length > 0 ? raw.toString('utf8') : String(rb || '')
      if (text) body = cleanAndParse(text)
    }
  } catch (e) {
    console.error('body error:', e.message)
    return res.status(400).json({ error: 'Body parse failed', detail: e.message })
  }

  const { api_key, broker_name, account_login, sync_type, trades } = body
  if (!api_key) return res.status(401).json({ error: 'API key required' })

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: connection, error: connError } = await supabase
      .from('broker_connections')
      .select('id, user_id, connection_type, total_synced')
      .eq('api_key', api_key)
      .eq('is_active', true)
      .single()

    if (connError || !connection) return res.status(401).json({ error: 'Invalid API key' })

    const { user_id, id: connection_id, connection_type } = connection
    let imported = 0, skipped = 0, errors = 0

    if (trades && trades.length > 0) {
      try {
        const incomingTickets = trades.map(t => String(t.ticket));
        
        const { data: existingTrades, error: existingError } = await supabase
          .from('trades')
          .select('broker_ticket')
          .eq('user_id', user_id)
          .in('broker_ticket', incomingTickets);
          
        if (existingError) {
          throw new Error('Failed to fetch existing trades: ' + existingError.message);
        }
        
        const existingTicketSet = new Set(existingTrades.map(t => t.broker_ticket));
        const tradesToInsert = [];

        for (const trade of trades) {
          if (existingTicketSet.has(String(trade.ticket))) {
            skipped++;
            continue;
          }
          
          existingTicketSet.add(String(trade.ticket));

          try {
            const entryDate = new Date(trade.entry_time);
            const exitDate = new Date(trade.exit_time);
            const holdingMins = Math.round((exitDate - entryDate) / 60000);
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

            tradesToInsert.push({
              user_id,
              account_login: account_login ? String(account_login) : null,
              currency: 'USD',
              broker_ticket: String(trade.ticket),
              symbol: trade.symbol,
              direction: trade.direction === 'Buy' ? 'LONG' : 'SHORT',
              option_type: null,
              raw_direction: trade.direction,
              pnl: trade.pnl,
              fees: Math.abs(trade.commission || 0) + Math.abs(trade.swap || 0),
              swap: trade.swap || 0,
              quantity: trade.lots,
              entry_time: (trade.entry_time.split(' ')[1] || '00:00:00'),
              date: trade.entry_time.split(' ')[0],
              month: months[entryDate.getMonth()],
              year: entryDate.getFullYear(),
              status: trade.pnl > 0 ? 'Win' : trade.pnl < 0 ? 'Loss' : 'Breakeven',
              holding_time_mins: holdingMins,
              sync_source: connection_type,
              needs_review: true,
              broker_name: broker_name || '',
              magic_number: trade.magic_number || 0,
              trade_comment: trade.comment || ''
            });
          } catch (e) {
            errors++;
            skipped++;
          }
        }

        if (tradesToInsert.length > 0) {
          const { error: insertError } = await supabase.from('trades').insert(tradesToInsert);
          if (insertError) {
            console.error('Batch insert error:', insertError);
            errors += tradesToInsert.length;
          } else {
            imported += tradesToInsert.length;
          }
        }
      } catch (err) {
        console.error('Processing batch error:', err);
        errors += trades.length;
      }
    }

    let pendingReviewQuery = supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('needs_review', true)
      .eq('sync_source', connection_type);

    let totalSyncedQuery = supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('sync_source', connection_type);

    if (account_login) {
      pendingReviewQuery = pendingReviewQuery.eq('account_login', String(account_login));
      totalSyncedQuery = totalSyncedQuery.eq('account_login', String(account_login));
    }

    const { count: pendingReviewCount } = await pendingReviewQuery;
    const { count: totalSyncedCount } = await totalSyncedQuery;

    await supabase.from('broker_connections')
      .update({ 
        last_sync_at: new Date().toISOString(), 
        total_synced: totalSyncedCount || 0,
        trades_pending_review: pendingReviewCount || 0
      })
      .eq('id', connection_id)

    await supabase.from('sync_logs').insert({
      user_id, connection_id,
      sync_type: sync_type || 'realtime',
      trades_received: trades ? trades.length : 0,
      trades_imported: imported,
      trades_skipped: skipped,
      status: errors > 0 && imported === 0 ? 'failed' : errors > 0 ? 'partial' : 'success',
      synced_at: new Date().toISOString()
    })

    console.log('sync complete', { imported, skipped, errors })
    return res.status(200).json({ success: true, imported, skipped, errors, total: trades ? trades.length : 0 })
  } catch (err) {
    console.error('sync error:', err.message)
    return res.status(500).json({ error: 'Sync failed', message: err.message })
  }
}
