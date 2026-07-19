const fs = require('fs');

// --- Fix 1: StrategyDetail.tsx ---
let sd = fs.readFileSync('src/pages/StrategyDetail.tsx', 'utf8');

const sdTarget1 = `              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-bold tracking-tight font-display" style={{ color: 'var(--text)', fontSize: '28px', letterSpacing: '-0.3px' }}>
                    {strategy ? strategy.name : 'Strategy details'}
                  </h1>
                  {strategy && (
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border shrink-0" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                      {strategy.type_of_strategy}
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                  STATUS:{' '}
                  <span
                    className="font-bold uppercase animate-fade-in"
                    style={{
                      color:
                        strategy?.status?.toLowerCase() === 'active'
                          ? '#008F67'
                          : strategy?.status?.toLowerCase() === 'not working'
                          ? '#f59e0b'
                          : '#71717a'
                    }}
                  >
                    {strategy?.status ? strategy.status.toUpperCase() : 'ACTIVE'}
                  </span>
                </p>
              </div>`;

const sdReplacement1 = `              <div>
                <h1 className="font-bold tracking-tight font-display" style={{ color: 'var(--text)', fontSize: '28px', letterSpacing: '-0.3px' }}>
                  {strategy ? strategy.name : 'Strategy details'}
                </h1>
              </div>`;

const sdTarget2 = `              </div>
            </div>

            {/* TAB SELECTORS ACTIONS */}`;

const sdReplacement2 = `              </div>
            </div>

            {strategy && (
              <div className="flex items-center gap-2.5 mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border shrink-0" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                  {strategy.type_of_strategy}
                </span>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  STATUS:{' '}
                  <span
                    className="font-bold uppercase"
                    style={{
                      color:
                        strategy?.status?.toLowerCase() === 'active'
                          ? '#008F67'
                          : strategy?.status?.toLowerCase() === 'not working'
                          ? '#f59e0b'
                          : '#71717a'
                    }}
                  >
                    {strategy?.status ? strategy.status.toUpperCase() : 'ACTIVE'}
                  </span>
                </p>
              </div>
            )}

            {/* TAB SELECTORS ACTIONS */}`;

if (sd.includes(sdTarget1) && sd.includes(sdTarget2)) {
  sd = sd.replace(sdTarget1, sdReplacement1);
  sd = sd.replace(sdTarget2, sdReplacement2);
  fs.writeFileSync('src/pages/StrategyDetail.tsx', sd);
  console.log('✅ StrategyDetail.tsx updated successfully.');
} else {
  console.error('❌ Failed to find targets in StrategyDetail.tsx');
  process.exit(1);
}

// --- Fix 2: TradeTrackingPage.tsx ---
let tt = fs.readFileSync('src/pages/TradeTrackingPage.tsx', 'utf8');

const ttTarget = `<div style={{ backgroundColor: 'var(--card)', paddingTop: '6px', paddingBottom: '6px' }} className="-mx-6 px-6 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-0">
              <div>
                <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700 }} className="font-display">
                  Trade Tracking
                </h1>
              </div>`;

const ttReplacement = `<div style={{ backgroundColor: 'var(--card)', width: 'calc(100% + 32px)', marginLeft: '-16px', marginRight: '-16px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '3px', paddingBottom: '3px', borderBottom: '1px solid var(--border)' }} className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.3px' }} className="font-display">
                  Trade Tracking
                </h1>
              </div>`;

if (tt.includes(ttTarget)) {
  tt = tt.replace(ttTarget, ttReplacement);
  fs.writeFileSync('src/pages/TradeTrackingPage.tsx', tt);
  console.log('✅ TradeTrackingPage.tsx updated successfully.');
} else {
  console.error('❌ Failed to find target in TradeTrackingPage.tsx');
  process.exit(1);
}

