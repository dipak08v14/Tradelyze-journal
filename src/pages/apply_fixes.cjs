const fs = require('fs');

let content = fs.readFileSync('DashboardPage.tsx', 'utf8');

const standardShadow = "boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)'";
const elevatedShadow = "boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)'";

// 1. Line 1793
content = content.replace(
  `                      letterSpacing: '0.3px'\n                    }}\n                    className="shrink-0 flex items-center gap-1.5 font-mono uppercase tracking-wider shadow-md"`,
  `                      letterSpacing: '0.3px',\n                      ${standardShadow}\n                    }}\n                    className="shrink-0 flex items-center gap-1.5 font-mono uppercase tracking-wider"`
);

// 2. Line 1961
content = content.replace(
  `className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20 shadow-xl" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}`,
  `className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', ${standardShadow} }}`
);

// 3. Line 3399
content = content.replace(
  `className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', display: 'none' }}`,
  `className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', ${standardShadow}, display: 'none' }}`
);

// 4. Line 1931
content = content.replace(
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '10px' }} className="p-4 h-24 relative overflow-hidden flex flex-col justify-between"`,
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '10px', ${standardShadow} }} className="p-4 h-24 relative overflow-hidden flex flex-col justify-between"`
);

// 5. Line 2140
content = content.replace(
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', height: '300px', position: 'relative', overflow: 'hidden' }}`,
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', ${standardShadow}, height: '300px', position: 'relative', overflow: 'hidden' }}`
);

// 6. Line 2601
content = content.replace(
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}`,
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', ${standardShadow} }}`
);

// 7. Line 2764
content = content.replace(
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', minWidth: '0px', overflow: 'hidden', boxSizing: 'border-box' }}`,
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', ${standardShadow}, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', minWidth: '0px', overflow: 'hidden', boxSizing: 'border-box' }}`
);

// 8. Line 2911
content = content.replace(
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', display: 'none' }}`,
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', ${standardShadow}, display: 'none' }}`
);

// 9. Line 3039
content = content.replace(
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', display: 'none' }}`,
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', ${standardShadow}, display: 'none' }}`
);

// 10. Line 3218
content = content.replace(
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>\n                    <div>\n                      <h2 className="text-lg font-semibold tracking-tight"`,
  `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', ${standardShadow} }}>\n                    <div>\n                      <h2 className="text-lg font-semibold tracking-tight"`
);
// I added a bit of context for line 3218 replacement to be safe and avoid matching other divs if they exist.

// 11. Line 3338
content = content.replace(
  `<div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', display: 'none' }}>\n                  <h2 className="text-lg font-semibold tracking-tight flex items-center gap-1.5 mb-5" style={{ color: 'var(--text)' }}>`,
  `<div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', ${standardShadow}, display: 'none' }}>\n                  <h2 className="text-lg font-semibold tracking-tight flex items-center gap-1.5 mb-5" style={{ color: 'var(--text)' }}>`
);

// 12. Lines 3451 & 3458
content = content.replace(
  `          style={{ \n            backgroundColor: 'var(--card)', \n            border: '0.5px solid var(--border)', \n            borderRadius: '16px',\n            maxHeight: '90vh',\n            overflowY: 'auto'\n          }} \n          className="w-full max-w-[680px] p-6 relative flex flex-col gap-5 shadow-2xl"`,
  `          style={{ \n            backgroundColor: 'var(--card)', \n            border: '0.5px solid var(--border)', \n            borderRadius: '16px',\n            ${elevatedShadow},\n            maxHeight: '90vh',\n            overflowY: 'auto'\n          }} \n          className="w-full max-w-[680px] p-6 relative flex flex-col gap-5"`
);

// 13. Line 1072
content = content.replace(
  `boxShadow: '0 8px 24px rgba(0,0,0,0.15)',`,
  `${elevatedShadow},`
);

// 14. Line 1858
content = content.replace(
  `boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',`,
  `${elevatedShadow},`
);

// 15. Line 158
content = content.replace(
  `boxShadow: '0 2px 6px rgba(0,0,0,0.12)',`,
  `${elevatedShadow},`
);

// 16. Lines 2377 & 2480 (Tooltips)
content = content.replace(
  /<div style=\{\{ backgroundColor: 'var\(--card\)', border: '0\.5px solid var\(--border\)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontFamily: 'monospace' \}\}>/g,
  `<div style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', ${elevatedShadow}, padding: '5px 10px', fontSize: '11px', fontFamily: 'monospace' }}>`
);

fs.writeFileSync('DashboardPage.tsx', content);

// Verification step
const verifyContent = fs.readFileSync('DashboardPage.tsx', 'utf8');

const regexes = [/shadow-md/g, /shadow-xl/g, /shadow-sm/g, /shadow-2xl/g];
let passed = true;
console.log('--- Verification ---');
regexes.forEach(reg => {
    const matches = verifyContent.match(reg);
    if (matches && matches.length > 0) {
        // Exclude line 1793? We removed it. 
        // We only expect none. Let's see if there are any.
        console.log(`Found ${matches.length} occurrences of ${reg}`);
        passed = false;
    } else {
        console.log(`0 occurrences of ${reg}`);
    }
});
if (passed) console.log('All verification checks passed.');
