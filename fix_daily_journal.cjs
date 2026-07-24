const fs = require('fs');
const file = 'src/pages/DailyJournal.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

let results = [];

// 1 & 2: Fix border colors globally since there are exactly 2 remaining (Day Card and Calendar)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('1px solid rgba(0,0,0,0.06)')) {
    const before = lines[i].trim();
    lines[i] = lines[i].replace(/1px solid rgba\(0,0,0,0\.06\)/g, '1px solid var(--border)');
    const after = lines[i].trim();
    
    let name = 'Main Day Card Wrapper or Right Sidebar Calendar Widget';
    if (lines[i].includes('isHighlighted')) name = 'Main Day Card Wrapper';
    if (lines[i].includes('sticky top-6')) name = 'Right Sidebar Calendar Widget';
    
    results.push(`- **FIX: ${name}** (Line ${i + 1})\n  *Before:* \`${before}\`\n  *After:* \`${after}\``);
  }
}

// 3: Mini Equity Curve Chart
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('h-[120px] w-full rounded-lg')) {
    const before = lines[i].trim();
    lines[i] = lines[i].replace('rounded-lg', 'rounded-xl');
    const after = lines[i].trim();
    results.push(`- **FIX: Mini Equity Curve Chart** (Line ${i + 1})\n  *Before:* \`${before}\`\n  *After:* \`${after}\``);
  }
}

// 4: Trade Table Wrapper
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('borderRadius: \'10px\'') && lines[i].includes('overflow-x-auto')) {
    const before = lines[i].trim();
    lines[i] = lines[i].replace('borderRadius: \'10px\'', 'borderRadius: \'12px\'');
    const after = lines[i].trim();
    results.push(`- **FIX: Trade Table Wrapper** (Line ${i + 1})\n  *Before:* \`${before}\`\n  *After:* \`${after}\``);
  }
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Successfully modified DailyJournal.tsx\n');
console.log(results.join('\n\n'));
