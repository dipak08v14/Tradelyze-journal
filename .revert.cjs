const fs = require('fs');

// REVERT 1: AiTeacherPage.tsx
let c1 = fs.readFileSync('src/pages/AiTeacherPage.tsx', 'utf8');
const target1 = `<header 
            style={{
              background: 'var(--card)',
              width: 'calc(100% + 32px)',
              marginLeft: '-16px',
              marginRight: '-16px',
              paddingTop: '3px',
              paddingBottom: '3px',
              paddingLeft: '16px',
              paddingRight: '16px',
              borderRadius: 0,
              boxShadow: 'none',
              border: 'none',
              borderBottom: '1px solid var(--border)'
            }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >`;
const replacement1 = `<header 
            style={{
              background: 'var(--card)',
              paddingTop: '3px',
              paddingBottom: '3px',
              paddingLeft: '24px',
              paddingRight: '24px',
              borderRadius: 0,
              boxShadow: 'none',
              border: 'none',
              borderBottom: '1px solid var(--border)'
            }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >`;
c1 = c1.replace(target1, replacement1);
fs.writeFileSync('src/pages/AiTeacherPage.tsx', c1);
console.log('Reverted AiTeacherPage.tsx');

// REVERT 2: TradingLogsPage.tsx
let c2 = fs.readFileSync('src/pages/TradingLogsPage.tsx', 'utf8');
const target2 = `                    style={{
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: 'var(--text-sub)',`;
const replacement2 = `                    style={{
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: 'var(--text-sub)',`;
c2 = c2.replace(target2, replacement2);
fs.writeFileSync('src/pages/TradingLogsPage.tsx', c2);
console.log('Reverted TradingLogsPage.tsx');
