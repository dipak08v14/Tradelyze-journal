import { createClient } from '@supabase/supabase-js'

const monthsAbbrev = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function extractDateAndTimeParts(entryTimeStr) {
  let date_val = '2000-01-01'
  let entry_time_val = '00:00:00'
  let month_val = 'Jan'
  let year_val = 2026

  if (entryTimeStr && typeof entryTimeStr === 'string') {
    const cleaned = entryTimeStr.replace('T', ' ')
    const parts = cleaned.trim().split(/\s+/)
    if (parts[0]) {
      date_val = parts[0]
      const dateParts = date_val.split('-')
      if (dateParts[0]) {
        const parsedYear = parseInt(dateParts[0], 10)
        if (!isNaN(parsedYear)) {
          year_val = parsedYear
        }
      }
      if (dateParts[1]) {
        const monthIdx = parseInt(dateParts[1], 10) - 1
        if (monthIdx >= 0 && monthIdx < 12) {
          month_val = monthsAbbrev[monthIdx]
        }
      }
    }
    if (parts[1]) {
      let timeStr = parts[1]
      // clean millisecond or timezone suffixes if any
      timeStr = timeStr.split('.')[0].split('+')[0].split('Z')[0]
      const timeSegments = timeStr.split(':')
      if (timeSegments.length === 2) {
        timeStr = `${timeStr}:00`
      }
      entry_time_val = timeStr
    }
  }

  return { date_val, entry_time_val, month_val, year_val }
}

function calculateHoldingTime(entryTimeStr, exitTimeStr) {
  let holding_time_mins = 0
  if (entryTimeStr && exitTimeStr) {
    const entryCleaned = entryTimeStr.trim().replace(' ', 'T')
    const exitCleaned = exitTimeStr.trim().replace(' ', 'T')
    const entryMs = Date.parse(entryCleaned)
    const exitMs = Date.parse(exitCleaned)
    if (!isNaN(entryMs) && !isNaN(exitMs)) {
      const diffMs = exitMs - entryMs
      holding_time_mins = Math.max(0, Math.floor(diffMs / 60000))
    }
  }
  return holding_time_mins
}

export default async function handler(req, res) {
  // CORS headers — set on every single response, including errors
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  try {
    let body = req.body || {}
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' })
      }
    }

    const { api_key, broker_name, account_login, sync_type, trades } = body

    if (!api_key) {
      return res.status(401).json({ error: 'Invalid API key' })
    }

    // Initialize Supabase admin client
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Step 1 — Validate API key: Query broker_connections where api_key = api_key AND is_active = true
    const { data: brokerData, error: brokerError } = await supabase
      .from('broker_connections')
      .select('user_id, id, connection_type, total_synced')
      .eq('api_key', api_key)
      .eq('is_active', true)

    if (brokerError || !brokerData || brokerData.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' })
    }

    const user_id = brokerData[0].user_id
    const connection_id = brokerData[0].id
    const connection_type = brokerData[0].connection_type
    const currentTotalSynced = brokerData[0].total_synced || 0

    // Step 2 — Initialise counters
    let imported = 0
    let skipped = 0
    let errors = 0

    const tradesArray = Array.isArray(trades) ? trades : []

    // Step 3 — Process each trade in the trades array one by one
    for (const trade of tradesArray) {
      try {
        const ticketVal = trade.ticket !== undefined && trade.ticket !== null ? trade.ticket : ''
        const ticketStr = ticketVal.toString()

        if (!ticketStr) {
          skipped++
          errors++
          continue
        }

        // Check for duplicate trade by broker_ticket and user_id
        const { data: dupData, error: dupError } = await supabase
          .from('trades')
          .select('id')
          .eq('broker_ticket', ticketStr)
          .eq('user_id', user_id)

        if (dupError) {
          errors++
          skipped++
          continue
        }

        if (dupData && dupData.length > 0) {
          skipped++
          continue
        }

        // Destructure date/time parts
        const { date_val, entry_time_val, month_val, year_val } = extractDateAndTimeParts(trade.entry_time)

        // Calculate holding time in whole minutes
        const holding_time_mins = calculateHoldingTime(trade.entry_time, trade.exit_time)

        const pnlVal = Number(trade.pnl) || 0
        const isWin = pnlVal > 0
        const isLoss = pnlVal < 0
        const status_val = isWin ? 'Win' : isLoss ? 'Loss' : 'Breakeven'

        const commissionVal = Math.abs(Number(trade.commission) || 0)
        const swapVal = Number(trade.swap) || 0
        const totalFees = commissionVal + Math.abs(swapVal)

        // Prepare trades payload with strict column mapping
        const tradePayload = {
          user_id,
          broker_ticket: ticketStr,
          symbol: trade.symbol || '',
          call_put: trade.direction === 'Buy' ? 'LONG' : 'SHORT',
          raw_direction: trade.direction || '',
          pnl: pnlVal,
          fees: totalFees,
          swap: swapVal,
          quantity: Number(trade.lots) || 0,
          entry_time: entry_time_val,
          date: date_val,
          month: month_val,
          year: year_val,
          status: status_val,
          holding_time_mins,
          sync_source: connection_type,
          needs_review: true,
          broker_name: broker_name || trade.broker_name || null,
          magic_number: Number(trade.magic_number) || 0,
          trade_comment: trade.comment || ''
        }

        // Insert into trades table
        const { error: insertError } = await supabase
          .from('trades')
          .insert(tradePayload)

        if (insertError) {
          errors++
          skipped++
        } else {
          imported++
        }

      } catch (tradeError) {
        errors++
        skipped++
      }
    }

    // Step 4 — After all trades are processed: Update broker connections and logs
    const newTotalSynced = currentTotalSynced + imported
    const lastSyncAt = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('broker_connections')
      .update({
        last_sync_at: lastSyncAt,
        total_synced: newTotalSynced
      })
      .eq('id', connection_id)

    // Insert sync log row
    let syncStatus = 'success'
    if (errors > 0) {
      if (imported === 0) {
        syncStatus = 'failed'
      } else {
        syncStatus = 'partial'
      }
    }

    const { error: logError } = await supabase
      .from('sync_logs')
      .insert({
        user_id,
        connection_id,
        sync_type: sync_type || null,
        trades_received: tradesArray.length,
        trades_imported: imported,
        trades_skipped: skipped,
        status: syncStatus,
        synced_at: lastSyncAt
      })

    // Step 5 — Return success response with CORS headers
    return res.status(200).json({
      success: true,
      imported,
      skipped,
      errors,
      total: tradesArray.length
    })

  } catch (err) {
    return res.status(500).json({
      error: 'Sync failed',
      message: err.message
    })
  }
}
