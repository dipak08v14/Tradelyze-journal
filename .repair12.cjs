const fs = require('fs');

// --- Fix 1: StrategyDetail.tsx ---
let sd = fs.readFileSync('src/pages/StrategyDetail.tsx', 'utf8');

const regex1 = /<div>[\s\S]*?<div className="flex items-center gap-2\.5 flex-wrap">[\s\S]*?<h1 className="font-bold tracking-tight font-display" style={{ color: 'var\(--text\)', fontSize: '28px', letterSpacing: '-0\.3px' }}>[\s\S]*?\{strategy \? strategy\.name : 'Strategy details'\}[\s\S]*?<\/h1>[\s\S]*?\{strategy && \([\s\S]*?<span className="px-2 py-0\.5 rounded text-\[10px\] uppercase font-bold tracking-wider border shrink-0" style={{ backgroundColor: 'var\(--accent-muted\)', color: 'var\(--accent\)', borderColor: 'var\(--accent\)' }}>[\s\S]*?\{strategy\.type_of_strategy\}[\s\S]*?<\/span>[\s\S]*?\)\}[\s\S]*?<\/div>[\s\S]*?<p className="text-xs font-mono" style={{ color: 'var\(--text-muted\)', marginLeft: '8px' }}>[\s\S]*?STATUS:\{' '\}[\s\S]*?<span[\s\S]*?className="font-bold uppercase animate-fade-in"[\s\S]*?style=\{\{[\s\S]*?color:[\s\S]*?strategy\?\.status\?\.toLowerCase\(\) === 'active'[\s\S]*?\? '#008F67'[\s\S]*?\? '#f59e0b'[\s\S]*?\: '#71717a'[\s\S]*?\}\}[\s\S]*?>[\s\S]*?\{strategy\?\.status \? strategy\.status\.toUpperCase\(\) : 'ACTIVE'\}[\s\S]*?<\/span>[\s\S]*?<\/p>[\s\S]*?<\/div>/;

const replacement1 = `<div>
                <h1 className="font-bold tracking-tight font-display" style={{ color: 'var(--text)', fontSize: '28px', letterSpacing: '-0.3px' }}>
                  {strategy ? strategy.name : 'Strategy details'}
                </h1>
              </div>`;

const regex2 = /<\/Link>\s*<\/div>\s*<\/div>\s*\{\/\*\s*TAB SELECTORS ACTIONS\s*\*\/\}/;

const replacement2 = `</Link>
              </div>
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

if (regex1.test(sd) && regex2.test(sd)) {
  sd = sd.replace(regex1, replacement1);
  sd = sd.replace(regex2, replacement2);
  fs.writeFileSync('src/pages/StrategyDetail.tsx', sd);
  console.log('✅ StrategyDetail.tsx updated successfully.');
} else {
  console.error('❌ Failed to find targets in StrategyDetail.tsx via regex');
  if (!regex1.test(sd)) console.error('Regex 1 failed');
  if (!regex2.test(sd)) console.error('Regex 2 failed');
  process.exit(1);
}

// --- Fix 2: TradeTrackingPage.tsx ---
let tt = fs.readFileSync('src/pages/TradeTrackingPage.tsx', 'utf8');

const regex3 = /<div style=\{\{ backgroundColor: 'var\(--card\)', paddingTop: '6px', paddingBottom: '6px' \}\} className="-mx-6 px-6 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-0">[\s\S]*?<div>[\s\S]*?<h1 style=\{\{ color: 'var\(--text\)', fontSize: '28px', fontWeight: 700 \}\} className="font-display">[\s\S]*?Trade Tracking[\s\S]*?<\/h1>[\s\S]*?<\/div>/;

const replacement3 = `<div style={{ backgroundColor: 'var(--card)', width: 'calc(100% + 32px)', marginLeft: '-16px', marginRight: '-16px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '3px', paddingBottom: '3px', borderBottom: '1px solid var(--border)' }} className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.3px' }} className="font-display">
                  Trade Tracking
                </h1>
              </div>`;

if (regex3.test(tt)) {
  tt = tt.replace(regex3, replacement3);
  fs.writeFileSync('src/pages/TradeTrackingPage.tsx', tt);
  console.log('✅ TradeTrackingPage.tsx updated successfully.');
} else {
  console.error('❌ Failed to find target in TradeTrackingPage.tsx via regex');
  process.exit(1);
}
