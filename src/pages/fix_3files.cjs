const fs = require('fs');

const standardShadow = "boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)'";
const elevatedShadow = "boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)'";

// Fix TradeEntryPage.tsx
let tradeContent = fs.readFileSync('TradeEntryPage.tsx', 'utf8');
tradeContent = tradeContent.replace(
  "borderRadius: '8px'",
  `borderRadius: '8px',\n                                ${elevatedShadow}`
);
tradeContent = tradeContent.replace(
  "className=\"absolute left-0 right-0 mt-1 border shadow-xl z-50 overflow-hidden font-mono text-[13px]\"",
  "className=\"absolute left-0 right-0 mt-1 border z-50 overflow-hidden font-mono text-[13px]\""
);
fs.writeFileSync('TradeEntryPage.tsx', tradeContent);


// Fix AiTeacherPage.tsx
let aiContent = fs.readFileSync('AiTeacherPage.tsx', 'utf8');
aiContent = aiContent.replace(
  "style={{ backgroundColor: 'var(--bg-sub, var(--card))', borderColor: 'var(--border)' }}",
  `style={{ backgroundColor: 'var(--bg-sub, var(--card))', borderColor: 'var(--border)', ${elevatedShadow} }}`
);
aiContent = aiContent.replace(
  "className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[400px] overflow-y-auto shadow-2xl transition-transform duration-250 ease-in-out ${",
  "className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[400px] overflow-y-auto transition-transform duration-250 ease-in-out ${"
);

aiContent = aiContent.replace(
  "<div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }} className=\"w-full h-full flex flex-col\">",
  `<div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', ${standardShadow} }} className="w-full h-full flex flex-col">`
);
fs.writeFileSync('AiTeacherPage.tsx', aiContent);


// Fix StrategiesPage.tsx
let stratContent = fs.readFileSync('StrategiesPage.tsx', 'utf8');

stratContent = stratContent.replace(
  "className=\"absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] shadow-xl z-40 p-4 animate-fade-in\"",
  "className=\"absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] z-40 p-4 animate-fade-in\""
);
stratContent = stratContent.replace(
  "className=\"absolute right-4 mt-1 w-40 shadow-xl z-30 p-1\"",
  "className=\"absolute right-4 mt-1 w-40 z-30 p-1\""
);
stratContent = stratContent.replace(
  "className=\"absolute right-0 mt-1 w-36 shadow-xl z-30 p-1\"",
  "className=\"absolute right-0 mt-1 w-36 z-30 p-1\""
);

stratContent = stratContent.split("boxShadow: '0 4px 16px rgba(0,0,0,0.10)'").join(elevatedShadow);

fs.writeFileSync('StrategiesPage.tsx', stratContent);

// VERIFICATION SCRIPT INCORPORATED
const checkShadows = (file) => {
  const c = fs.readFileSync(file, 'utf8');
  const xl = (c.match(/shadow-xl/g) || []).length;
  const xxl = (c.match(/shadow-2xl/g) || []).length;
  console.log(`${file} => shadow-xl: ${xl}, shadow-2xl: ${xxl}`);
  
  let dupes = 0;
  const lines = c.split('\n');
  lines.forEach((l, i) => {
    if (l.match(/style=\{.*style=\{/)) {
       console.log(`Duplicate style prop on line ${i+1} in ${file}`);
       dupes++;
    }
  });
};

checkShadows('TradeEntryPage.tsx');
checkShadows('AiTeacherPage.tsx');
checkShadows('StrategiesPage.tsx');
