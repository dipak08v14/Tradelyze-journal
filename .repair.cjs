const fs = require('fs');
let c = fs.readFileSync('src/pages/TradeEntryPage.tsx', 'utf8');

const target = `                borderBottom: '1px solid var(--border)',
                    <Link 
                       to={\`/trading-logs/\${id}\`}
                      style={{
                        backgroundColor: 'var(--bar)',
                        border: '0.5px solid var(--border)',
                        color: 'var(--text-sub)',
                        padding: '0 20px',`;

const replacement = `                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h1 className="font-display tracking-tight" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                  {isEditMode ? 'Edit Trade' : 'Log Trade'}
                </h1>
              </div>

              <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                <div className="flex items-center gap-3">
                  {isEditMode && (
                    <Link 
                       to={\`/trading-logs/\${id}\`}
                      style={{
                        backgroundColor: 'var(--bar)',
                        border: '0.5px solid var(--border)',
                        color: 'var(--text-sub)',
                        padding: '0 20px',`;

c = c.replace(target, replacement);
fs.writeFileSync('src/pages/TradeEntryPage.tsx', c);
console.log('Done');
