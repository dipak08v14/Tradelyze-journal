const fs = require('fs');
let c = fs.readFileSync('src/pages/TradeEntryPage.tsx', 'utf8');

const regex = /<main className="flex-1 overflow-y-auto px-0">[\s\S]*?Cancel[\s]*?<\/Link>[\s]*?}\)/;

const replacement = `<main className="flex-1 overflow-y-auto px-0">
          <form onSubmit={handleSaveTradeSubmit} className="w-full px-4">
            {/* PAGE HEADER */}
            <div
              style={{
                background: 'var(--card)',
                width: 'calc(100% + 32px)',
                marginLeft: '-16px',
                marginRight: '-16px',
                paddingTop: '6px',
                paddingBottom: '6px',
                paddingLeft: '16px',
                paddingRight: '16px',
                borderRadius: 0,
                boxShadow: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border)',
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
                        padding: '0 20px',
                        height: '34px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      className="w-full sm:w-auto transition-all text-center"
                    >
                      Cancel
                    </Link>
                  )}`;

c = c.replace(regex, replacement);
fs.writeFileSync('src/pages/TradeEntryPage.tsx', c);
console.log('Fixed TradeEntryPage via regex');
