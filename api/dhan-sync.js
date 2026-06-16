import { createClient } from '@supabase/supabase-js';
import { decrypt } from './_encryption.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  } else if (req.body) {
    body = req.body;
  }

  const syncType = body.sync_type || 'manual';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const authHeader = req.headers.authorization;
  const cronSecretHeader = req.headers['x-cron-secret'];

  let usersToSync = [];

  try {
    // Determine calling mode
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseObj = createClient(supabaseUrl, supabaseKey);
      const { data: { user }, error: authError } = await supabaseObj.auth.getUser(token);
      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized: User lookup failed' });
      }
      usersToSync = [{ userId: user.id, token: token, useUserAuth: true }];
    } else if (cronSecretHeader && cronSecretHeader === process.env.CRON_SECRET) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
      const { data: activeConnections, error: connError } = await supabaseAdmin
        .from('broker_connections')
        .select('user_id')
        .eq('broker_type', 'dhan')
        .eq('is_active', true)
        .eq('sync_status', 'connected');

      if (connError) {
        return res.status(500).json({ error: 'Failed to retrieve active connections', detail: connError.message });
      }
      usersToSync = (activeConnections || []).map(row => ({
        userId: row.user_id,
        useUserAuth: false
      }));
    } else {
      return res.status(401).json({ error: 'Unauthorized: Invalid token or cron secret matching failed' });
    }

    const overallResults = [];

    for (const task of usersToSync) {
      let supabaseUser;
      if (task.useUserAuth) {
        supabaseUser = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${task.token}`
            }
          }
        });
      } else {
        supabaseUser = createClient(supabaseUrl, supabaseKey);
      }

      let connectionId = null;
      let totalLegsReceived = 0;
      let totalLegsSkipped = 0;
      let tradesCreated = 0;

      try {
        // STEP A — GET DHAN TOKEN
        const { data: connectionData, error: connErr } = await supabaseUser
          .from('broker_connections')
          .select('*')
          .eq('user_id', task.userId)
          .eq('broker_type', 'dhan')
          .eq('is_active', true)
          .limit(1);

        if (connErr || !connectionData || connectionData.length === 0) {
          continue; // Skip user if connection is missing or inactive
        }
        const connRow = connectionData[0];
        connectionId = connRow.id;

        const decryptedToken = decrypt(connRow.access_token_encrypted);

        // STEP B — DETERMINE DATE RANGES
        const today = new Date().toISOString().split('T')[0];
        let dateRanges = [];

        if (syncType === 'historical') {
          const getSubtractedDateStr = (days) => {
            const d = new Date();
            d.setDate(d.getDate() - days);
            return d.toISOString().split('T')[0];
          };

          dateRanges = [
            { from_date: getSubtractedDateStr(365), to_date: getSubtractedDateStr(275) },
            { from_date: getSubtractedDateStr(274), to_date: getSubtractedDateStr(184) },
            { from_date: getSubtractedDateStr(183), to_date: getSubtractedDateStr(91) },
            { from_date: getSubtractedDateStr(90), to_date: today }
          ];
        } else {
          let lastSyncDate = today;
          if (connRow.last_sync_at) {
            lastSyncDate = new Date(connRow.last_sync_at).toISOString().split('T')[0];
          } else {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            lastSyncDate = d.toISOString().split('T')[0];
          }
          dateRanges = [{ from_date: lastSyncDate, to_date: today }];
        }

        // STEP C — FETCH LEGS FROM DHAN
        for (const dateRange of dateRanges) {
          try {
            let page = 1;
            let hasMore = true;
            const maxPages = 1000; // Safety limit to avoid infinite loop

            while (hasMore && page <= maxPages) {
              const dhanRes = await fetch(`https://api.dhan.co/v2/trades/${dateRange.from_date}/${dateRange.to_date}/${page}`, {
                method: 'GET',
                headers: {
                  'access-token': decryptedToken,
                  'Content-Type': 'application/json'
                }
              });

              if (!dhanRes.ok) {
                console.error(`Dhan API fetch error for range ${dateRange.from_date} to ${dateRange.to_date} page ${page}:`, dhanRes.status);
                break;
              }

              const resJson = await dhanRes.json();
              if (resJson && resJson.status === 'success' && Array.isArray(resJson.data) && resJson.data.length > 0) {
                const legs = resJson.data;
                for (const leg of legs) {
                  totalLegsReceived++;
                  const dhanOrderId = String(leg.orderId);

                  // Check if already exists
                  const { data: existingLegs } = await supabaseUser
                    .from('dhan_raw_legs')
                    .select('id')
                    .eq('dhan_order_id', dhanOrderId)
                    .eq('user_id', task.userId)
                    .limit(1);

                  if (existingLegs && existingLegs.length > 0) {
                    totalLegsSkipped++;
                    continue;
                  }

                  let tradeTime = leg.createTime;
                  if (!tradeTime) {
                    tradeTime = new Date().toISOString();
                  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(tradeTime)) {
                    tradeTime = tradeTime.replace(' ', 'T') + '+05:30'; // Administer Dhan's Indian Market Timezone
                  }

                  await supabaseUser
                    .from('dhan_raw_legs')
                    .insert({
                      user_id: task.userId,
                      connection_id: connectionId,
                      dhan_order_id: dhanOrderId,
                      symbol: leg.tradingSymbol || '',
                      exchange: leg.exchange || '',
                      segment: leg.exchangeSegment || '',
                      transaction_type: (leg.transactionType || '').toUpperCase(),
                      quantity: parseInt(String(leg.tradedQuantity || 0), 10),
                      price: parseFloat(String(leg.tradedPrice || 0)),
                      trade_time: tradeTime,
                      product_type: leg.productType || '',
                      order_type: leg.orderType || '',
                      is_matched: false,
                      raw_response: leg
                    });
                }
                page++;
              } else {
                hasMore = false;
              }
            }
          } catch (err) {
            console.error('Error syncing individual dateRange:', dateRange, err);
          }
        }

        // STEP D — RUN MATCHING ALGORITHM
        const { data: unmatchedLegs, error: unmatchedLegsErr } = await supabaseUser
          .from('dhan_raw_legs')
          .select('*')
          .eq('user_id', task.userId)
          .eq('is_matched', false)
          .order('trade_time', { ascending: true });

        if (unmatchedLegsErr) {
          throw new Error('Failed to retrieve unmatched legs: ' + unmatchedLegsErr.message);
        }

        // Helper: Open Position / пирамид add
        const open_position = async (leg, direction, optionType) => {
          const { data: sameDirPos } = await supabaseUser
            .from('dhan_open_positions')
            .select('*')
            .eq('user_id', task.userId)
            .eq('symbol', leg.symbol)
            .eq('opening_direction', direction)
            .eq('product_type', leg.product_type)
            .limit(1);

          if (sameDirPos && sameDirPos.length > 0) {
            const existingPosition = sameDirPos[0];
            const newTotalQty = existingPosition.total_quantity + leg.quantity;
            const newAvgPrice = ((existingPosition.avg_entry_price * existingPosition.total_quantity) + (leg.price * leg.quantity)) / newTotalQty;
            
            let currentLegsArray = Array.isArray(existingPosition.opening_leg_ids) ? existingPosition.opening_leg_ids : [];
            const newLegsArray = [...currentLegsArray, leg.dhan_order_id];

            await supabaseUser
              .from('dhan_open_positions')
              .update({
                total_quantity: newTotalQty,
                avg_entry_price: parseFloat(newAvgPrice.toFixed(4)),
                total_investment: parseFloat((newAvgPrice * newTotalQty).toFixed(2)),
                opening_leg_ids: newLegsArray,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingPosition.id);
          } else {
            await supabaseUser
              .from('dhan_open_positions')
              .insert({
                user_id: task.userId,
                connection_id: connectionId,
                symbol: leg.symbol,
                exchange: leg.exchange || '',
                segment: leg.segment || '',
                opening_direction: direction,
                option_type: optionType,
                total_quantity: leg.quantity,
                avg_entry_price: leg.price,
                total_investment: parseFloat((leg.price * leg.quantity).toFixed(2)),
                opening_time: leg.trade_time,
                opening_leg_ids: [leg.dhan_order_id],
                product_type: leg.product_type
              });
          }

          await supabaseUser
            .from('dhan_raw_legs')
            .update({
              is_matched: true,
              matched_at: new Date().toISOString()
            })
            .eq('id', leg.id);
        };

        // Helper: Close Trade
        const close_trade = async (closingLeg, openPosition) => {
          const qty = Math.min(closingLeg.quantity, openPosition.total_quantity);
          
          let pnl = 0;
          if (openPosition.opening_direction === 'LONG') {
            pnl = (closingLeg.price - openPosition.avg_entry_price) * qty;
          } else if (openPosition.opening_direction === 'SHORT') {
            pnl = (openPosition.avg_entry_price - closingLeg.price) * qty;
          }
          pnl = parseFloat(pnl.toFixed(2));

          const status = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Breakeven';

          const openingDateTime = new Date(openPosition.opening_time);
          const closingDateTime = new Date(closingLeg.trade_time);

          const pad = (n) => String(n).padStart(2, '0');
          const openingDate = `${openingDateTime.getFullYear()}-${pad(openingDateTime.getMonth() + 1)}-${pad(openingDateTime.getDate())}`;
          const openingTimeStr = `${pad(openingDateTime.getHours())}:${pad(openingDateTime.getMinutes())}:${pad(openingDateTime.getSeconds())}`;

          const holdingMins = Math.max(0, Math.round((closingDateTime.getTime() - openingDateTime.getTime()) / (1000 * 60)));

          const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const tradeMonth = monthNames[openingDateTime.getMonth()];
          const tradeYear = openingDateTime.getFullYear();

          const openingLegId = Array.isArray(openPosition.opening_leg_ids) && openPosition.opening_leg_ids.length > 0
            ? openPosition.opening_leg_ids[0]
            : 'UNKNOWN';

          const { data: newTrade, error: insertTradeErr } = await supabaseUser
            .from('trades')
            .insert({
              user_id: task.userId,
              date: openingDate,
              symbol: closingLeg.symbol.toUpperCase().trim(),
              direction: openPosition.opening_direction,
              option_type: openPosition.option_type || null,
              pnl: pnl,
              quantity: qty,
              investment: parseFloat((openPosition.avg_entry_price * qty).toFixed(2)),
              status: status,
              holding_time_mins: holdingMins,
              entry_time: openingTimeStr,
              month: tradeMonth,
              year: tradeYear,
              sync_source: 'dhan',
              broker_ticket: 'DHAN_' + openingLegId,
              needs_review: true
            })
            .select('id')
            .single();

          if (insertTradeErr) {
            throw new Error('Trade insertion failed: ' + insertTradeErr.message);
          }

          const newTradeId = newTrade.id;
          tradesCreated++;

          // Update/Delete position
          if (closingLeg.quantity < openPosition.total_quantity) {
            const remaining = openPosition.total_quantity - closingLeg.quantity;
            await supabaseUser
              .from('dhan_open_positions')
              .update({
                total_quantity: remaining,
                total_investment: parseFloat((openPosition.avg_entry_price * remaining).toFixed(2)),
                updated_at: new Date().toISOString()
              })
              .eq('id', openPosition.id);
          } else {
            await supabaseUser
              .from('dhan_open_positions')
              .delete()
              .eq('id', openPosition.id);
          }

          // Mark closing leg as matched and link trade
          await supabaseUser
            .from('dhan_raw_legs')
            .update({
              is_matched: true,
              matched_trade_id: newTradeId,
              matched_at: new Date().toISOString()
            })
            .eq('id', closingLeg.id);
        };

        // Run through each unmatched leg
        for (const leg of unmatchedLegs || []) {
          let optionType = null;
          const rawLegSymbol = String(leg.symbol || '').trim().toUpperCase();
          const rawLegResponse = leg.raw_response || {};
          const drvOptionType = String(rawLegResponse.drvOptionType || '').trim().toUpperCase();

          if (drvOptionType === 'CE' || rawLegSymbol.endsWith('CE')) {
            optionType = 'CALL';
          } else if (drvOptionType === 'PE' || rawLegSymbol.endsWith('PE')) {
            optionType = 'PUT';
          }

          const transactionType = String(leg.transaction_type || '').toUpperCase();

          if (transactionType === 'BUY') {
            const { data: shortPositions } = await supabaseUser
              .from('dhan_open_positions')
              .select('*')
              .eq('user_id', task.userId)
              .eq('symbol', leg.symbol)
              .eq('opening_direction', 'SHORT')
              .eq('product_type', leg.product_type)
              .limit(1);

            if (shortPositions && shortPositions.length > 0) {
              await close_trade(leg, shortPositions[0]);
            } else {
              await open_position(leg, 'LONG', optionType);
            }
          } else if (transactionType === 'SELL') {
            const { data: longPositions } = await supabaseUser
              .from('dhan_open_positions')
              .select('*')
              .eq('user_id', task.userId)
              .eq('symbol', leg.symbol)
              .eq('opening_direction', 'LONG')
              .eq('product_type', leg.product_type)
              .limit(1);

            if (longPositions && longPositions.length > 0) {
              await close_trade(leg, longPositions[0]);
            } else {
              await open_position(leg, 'SHORT', optionType);
            }
          }
        }

        // STEP E — UPDATE BROKER CONNECTION
        const { count: pendingReviewCount } = await supabaseUser
          .from('trades')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', task.userId)
          .eq('needs_review', true)
          .eq('sync_source', 'dhan');

        await supabaseUser
          .from('broker_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            total_synced: (connRow.total_synced || 0) + tradesCreated,
            trades_pending_review: pendingReviewCount || 0,
            sync_status: 'connected'
          })
          .eq('user_id', task.userId)
          .eq('broker_type', 'dhan');

        // STEP F — INSERT SYNC LOG
        await supabaseUser
          .from('sync_logs')
          .insert({
            user_id: task.userId,
            connection_id: connectionId,
            sync_type: syncType,
            trades_received: totalLegsReceived,
            trades_imported: tradesCreated,
            trades_skipped: totalLegsSkipped,
            status: 'success',
            synced_at: new Date().toISOString()
          });

        const { count: remainingOpenCount } = await supabaseUser
          .from('dhan_open_positions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', task.userId);

        overallResults.push({
          user_id: task.userId,
          success: true,
          trades_created: tradesCreated,
          positions_still_open: remainingOpenCount || 0,
          legs_skipped: totalLegsSkipped
        });

      } catch (innerErr) {
        console.error(`Error processing Dhan sync inner loop for user ${task.userId}:`, innerErr);
        
        try {
          await supabaseUser
            .from('broker_connections')
            .update({ sync_status: 'error' })
            .eq('user_id', task.userId)
            .eq('broker_type', 'dhan');

          await supabaseUser
            .from('sync_logs')
            .insert({
              user_id: task.userId,
              connection_id: connectionId,
              sync_type: syncType,
              trades_received: totalLegsReceived,
              trades_imported: 0,
              trades_skipped: totalLegsSkipped,
              status: 'failed',
              error_message: innerErr.message,
              synced_at: new Date().toISOString()
            });
        } catch (dbErr) {
          console.error('Failed to log failure stats to DB:', dbErr);
        }

        overallResults.push({
          user_id: task.userId,
          success: false,
          error: innerErr.message
        });
      }
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Single user trigger gets detailed single response matching spec
      const singleRes = overallResults[0];
      if (singleRes && singleRes.success) {
        return res.status(200).json({
          success: true,
          trades_created: singleRes.trades_created,
          positions_still_open: singleRes.positions_still_open,
          legs_skipped: singleRes.legs_skipped
        });
      } else {
        return res.status(500).json({
          error: singleRes ? singleRes.error : 'Connection sync failed'
        });
      }
    } else {
      // Cron-triggered responses
      return res.status(200).json({
        success: true,
        summary: overallResults
      });
    }

  } catch (err) {
    console.error('Unexpected error in dhan-sync route:', err);
    return res.status(500).json({ error: 'Unexpected server error: ' + err.message });
  }
}
