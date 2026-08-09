import { createClient } from '@supabase/supabase-js';
import { decrypt, encrypt } from '../src/lib/encryption.js';

function getOptionType(leg) {
  if (!leg) return null;
  const target = leg.raw_response || leg;

  if (target.drvOptionType === 'CE') return 'CALL';
  if (target.drvOptionType === 'PE') return 'PUT';
  if (target.drvOptionType === 'CALL') return 'CALL';
  if (target.drvOptionType === 'PUT') return 'PUT';

  const sym = (target.tradingSymbol || target.symbol || '').toUpperCase().trim();
  if (sym.endsWith('CE')) return 'CALL';
  if (sym.endsWith('PE')) return 'PUT';

  const custom = (target.customSymbol || '').toUpperCase().trim();
  if (custom.includes(' CALL') || custom.endsWith('CALL')) return 'CALL';
  if (custom.includes(' PUT') || custom.endsWith('PUT')) return 'PUT';

  return null;
}

function getMarketDirection(positionDirection, optionType) {
  if (optionType === 'PUT') {
    return positionDirection === 'LONG' ? 'SHORT' : 'LONG';
  }
  return positionDirection;
}

export default async function handler(req, res) {
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

      let userTradesCreated = 0;
      let userPositionsStillOpen = 0;
      let userLegsSkipped = 0;
      let userHadErrors = false;
      let userErrorMsg = '';

      try {
        // STEP A — GET DHAN TOKEN
        const { data: connectionData, error: connErr } = await supabaseUser
          .from('broker_connections')
          .select('*')
          .eq('user_id', task.userId)
          .eq('broker_type', 'dhan')
          .eq('is_active', true); // Removed .limit(1)

        if (connErr || !connectionData || connectionData.length === 0) {
          continue; // Skip user if connection is missing or inactive
        }

        for (const connRow of connectionData) {
          const connectionId = connRow.id;
          let totalLegsReceived = 0;
          let totalLegsSkipped = 0;
          let tradesCreated = 0;
          let decryptedToken = decrypt(connRow.access_token_encrypted);
          let hadApiErrors = false;

          try {
            const renewRes = await fetch('https://api.dhan.co/v2/RenewToken', {
              method: 'GET',
              headers: {
                'access-token': decryptedToken,
                'dhanClientId': connRow.account_login || ''
              }
            });
            
            let renewData = {};
            try {
              renewData = await renewRes.json();
            } catch (e) {
              const rawText = await renewRes.text().catch(() => 'unreadable');
              console.error('DHAN RENEW TOKEN - could not parse JSON, raw response:', rawText);
            }

            if (!renewRes.ok || !renewData.token) {
              console.error('DHAN RENEW TOKEN FAILURE - status:', renewRes.status, 'body:', JSON.stringify(renewData));
              await supabaseUser
                .from('broker_connections')
                .update({ sync_status: 'token_expired' })
                .eq('id', connectionId);

              await supabaseUser
                .from('sync_logs')
                .insert({
                  status: 'failed',
                  error_message: renewData.errorMessage || renewData.remarks || 'Dhan token expired or renewal failed',
                  trades_received: 0,
                  trades_imported: 0,
                  trades_skipped: 0,
                  synced_at: new Date().toISOString(),
                  user_id: task.userId,
                  connection_id: connectionId,
                  sync_type: syncType
                });
              continue;
            }

            decryptedToken = renewData.token;
            const newEncryptedToken = encrypt(decryptedToken);
            await supabaseUser
              .from('broker_connections')
              .update({ access_token_encrypted: newEncryptedToken })
              .eq('id', connectionId);

          } catch (renewErr) {
            await supabaseUser
              .from('broker_connections')
              .update({ sync_status: 'token_expired' })
              .eq('id', connectionId);

            await supabaseUser
              .from('sync_logs')
              .insert({
                status: 'failed',
                error_message: 'Dhan token expired or renewal failed',
                trades_received: 0,
                trades_imported: 0,
                trades_skipped: 0,
                synced_at: new Date().toISOString(),
                user_id: task.userId,
                connection_id: connectionId,
                sync_type: syncType
              });
            continue;
          }

          // STEP B — DETERMINE DATE RANGES
          const today = new Date().toISOString().split('T')[0];
          let dateRanges = [];

          if (syncType === 'historical') {
            const getSubtractedDateStr = (days) => {
              const d = new Date();
              d.setDate(d.getDate() - days);
              return d.toISOString().split('T')[0];
            };

            dateRanges = [];
            const maxDays = 1825;
            const chunkSize = 90;
            
            for (let i = maxDays; i > 0; i -= chunkSize) {
              const fromDays = i;
              let toDays = i - chunkSize;
              if (toDays < 0) toDays = 0;
              
              dateRanges.push({
                from_date: getSubtractedDateStr(fromDays),
                to_date: toDays === 0 ? today : getSubtractedDateStr(toDays + 1)
              });
            }
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
              let page = 0;
              let hasMore = true;
              const maxPages = 1000;

              while (hasMore && page <= maxPages) {
                const dhanRes = await fetch(`https://api.dhan.co/v2/trades/${dateRange.from_date}/${dateRange.to_date}/${page}`, {
                  method: 'GET',
                  headers: {
                    'access-token': decryptedToken,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                  }
                });

                if (!dhanRes.ok) {
                  console.error(`Dhan API fetch error for range ${dateRange.from_date} to ${dateRange.to_date} page ${page}:`, dhanRes.status);
                  hadApiErrors = true;
                  break;
                }

                const legs = await dhanRes.json();
                if (Array.isArray(legs) && legs.length > 0) {
                  for (const leg of legs) {
                    totalLegsReceived++;
                    const dhanOrderId = String(leg.orderId);

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

                    let tradeTime;
                    if (!leg.exchangeTime || leg.exchangeTime === 'NA') {
                      tradeTime = new Date().toISOString();
                    } else {
                      const parsedDate = new Date(leg.exchangeTime);
                      tradeTime = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
                    }

                    const symbolFallback = leg.tradingSymbol || leg.customSymbol || leg.securityId || '';

                    await supabaseUser
                      .from('dhan_raw_legs')
                      .insert({
                        user_id: task.userId,
                        connection_id: connectionId,
                        dhan_order_id: dhanOrderId,
                        symbol: symbolFallback,
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
            .eq('connection_id', connectionId)
            .eq('is_matched', false)
            .order('trade_time', { ascending: true });

          if (unmatchedLegsErr) {
            throw new Error('Failed to retrieve unmatched legs: ' + unmatchedLegsErr.message);
          }

          const open_position = async (leg, direction, optionType) => {
            const { data: sameDirPos } = await supabaseUser
              .from('dhan_open_positions')
              .select('*')
              .eq('user_id', task.userId)
              .eq('connection_id', connectionId)
              .eq('symbol', leg.symbol)
              .eq('opening_direction', direction)
              .eq('product_type', leg.product_type);

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

            const marketDirection = getMarketDirection(openPosition.opening_direction, openPosition.option_type);

            const { data: newTrade, error: insertTradeErr } = await supabaseUser
              .from('trades')
              .insert({
                user_id: task.userId,
                account_login: connRow.account_login || null,
                date: openingDate,
                symbol: closingLeg.symbol.toUpperCase().trim(),
                direction: marketDirection,
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

            await supabaseUser
              .from('dhan_raw_legs')
              .update({
                is_matched: true,
                matched_trade_id: newTradeId,
                matched_at: new Date().toISOString()
              })
              .eq('id', closingLeg.id);
          };

          for (const leg of unmatchedLegs || []) {
            const optionType = getOptionType(leg);
            const transactionType = String(leg.transaction_type || '').toUpperCase();

            if (transactionType === 'BUY') {
              const { data: shortPositions } = await supabaseUser
                .from('dhan_open_positions')
                .select('*')
                .eq('user_id', task.userId)
                .eq('connection_id', connectionId)
                .eq('symbol', leg.symbol)
                .eq('opening_direction', 'SHORT')
                .eq('product_type', leg.product_type);

              if (shortPositions && shortPositions.length > 0) {
                let remainingQty = leg.quantity;
                for (const pos of shortPositions) {
                  if (remainingQty <= 0) break;
                  const qtyToClose = Math.min(remainingQty, pos.total_quantity);
                  const legCopy = { ...leg, quantity: qtyToClose, id: leg.id };
                  await close_trade(legCopy, pos);
                  remainingQty -= qtyToClose;
                }
                if (remainingQty > 0) {
                  const legRemaining = { ...leg, quantity: remainingQty };
                  await open_position(legRemaining, 'LONG', optionType);
                }
              } else {
                await open_position(leg, 'LONG', optionType);
              }
            } else if (transactionType === 'SELL') {
              const { data: longPositions } = await supabaseUser
                .from('dhan_open_positions')
                .select('*')
                .eq('user_id', task.userId)
                .eq('connection_id', connectionId)
                .eq('symbol', leg.symbol)
                .eq('opening_direction', 'LONG')
                .eq('product_type', leg.product_type);

              if (longPositions && longPositions.length > 0) {
                let remainingQty = leg.quantity;
                for (const pos of longPositions) {
                  if (remainingQty <= 0) break;
                  const qtyToClose = Math.min(remainingQty, pos.total_quantity);
                  const legCopy = { ...leg, quantity: qtyToClose, id: leg.id };
                  await close_trade(legCopy, pos);
                  remainingQty -= qtyToClose;
                }
                if (remainingQty > 0) {
                  const legRemaining = { ...leg, quantity: remainingQty };
                  await open_position(legRemaining, 'SHORT', optionType);
                }
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
              sync_status: hadApiErrors ? 'error' : 'connected'
            })
            .eq('id', connectionId);

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
              status: hadApiErrors && tradesCreated === 0 ? 'failed' : (hadApiErrors && tradesCreated > 0 ? 'partial' : 'success'),
              synced_at: new Date().toISOString()
            });

          const { count: remainingOpenCount } = await supabaseUser
            .from('dhan_open_positions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', task.userId)
            .eq('connection_id', connectionId);

          userTradesCreated += tradesCreated;
          userPositionsStillOpen += remainingOpenCount || 0;
          userLegsSkipped += totalLegsSkipped;
        }

        overallResults.push({
          user_id: task.userId,
          success: !userHadErrors,
          trades_created: userTradesCreated,
          positions_still_open: userPositionsStillOpen,
          legs_skipped: userLegsSkipped,
          ...(userHadErrors && { error: userErrorMsg })
        });

      } catch (innerErr) {
        console.error(`Error processing Dhan sync for user ${task.userId}:`, innerErr);
        
        overallResults.push({
          user_id: task.userId,
          success: false,
          error: innerErr.message,
          trades_created: userTradesCreated,
          positions_still_open: userPositionsStillOpen,
          legs_skipped: userLegsSkipped
        });
      }
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
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
      return res.status(200).json({
        success: true,
        summary: overallResults
      });
    }

  } catch (err) {
    console.error('Unexpected error in dhan-sync route:', err);
    return res.status(500).json({ error: err.message });
  }
}
