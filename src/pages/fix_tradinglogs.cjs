const fs = require('fs');
let content = fs.readFileSync('TradingLogsPage.tsx', 'utf8');

const standardShadow = "boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)'";
const elevatedShadow = "boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)'";

// 1. Line 1446
content = content.replace(
  `className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}`,
  `className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', ${standardShadow} }}`
);

// 2. Line 1464
content = content.replace(
  `className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-16 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}`,
  `className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-16" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', ${standardShadow} }}`
);

// 3. Line 1012
content = content.replace(
  `boxShadow: '0 4px 20px rgba(0,0,0,0.12)'`,
  `${elevatedShadow}`
);

// 4. Lines 1863 & 1864
content = content.replace(
  `            <div \n              style={{ backgroundColor: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '16px' }}\n              className="w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"`,
  `            <div \n              style={{ backgroundColor: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '16px', ${elevatedShadow} }}\n              className="w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"`
);

// 5. Line 1485
content = content.replace(
  `style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderBottom: 'none', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.05)' }}`,
  `style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderBottom: 'none', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}`
);

// 6. Line 1784
content = content.replace(
  `style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderTop: 'none', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}`,
  `style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderTop: 'none', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}`
);

fs.writeFileSync('TradingLogsPage.tsx', content);

// VERIFICATION
const newContent = fs.readFileSync('TradingLogsPage.tsx', 'utf8');

const shadowSmCount = (newContent.match(/shadow-sm/g) || []).length;
const shadow2xlCount = (newContent.match(/shadow-2xl/g) || []).length;

console.log('shadow-sm count: ' + shadowSmCount);
console.log('shadow-2xl count: ' + shadow2xlCount);

// verify line 1485 & 1784 string don't contain boxShadow
if (newContent.includes(`boxShadow: '0 1px 4px rgba(0,0,0,.07)`)) {
    console.log('ERROR: 1485 shadow still exists');
} else {
    console.log('Line 1485 shadow removed.');
}

if (newContent.includes(`borderBottomRightRadius: '12px', boxShadow: '0 1px 3px rgba`)) {
    console.log('ERROR: 1784 shadow still exists');
} else {
    console.log('Line 1784 shadow removed.');
}
