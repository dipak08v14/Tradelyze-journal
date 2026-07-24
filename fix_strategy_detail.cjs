const fs = require('fs');
const file = 'src/pages/StrategyDetail.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const targets = [
  { line: 787, name: 'Cumulative P&L Chart Wrapper' },
  { line: 885, name: 'Entry Rules Selection Card' },
  { line: 953, name: 'Exit Rules Selection Card' },
  { line: 1025, name: 'Executed Trades Table Wrapper' },
  { line: 1163, name: 'Missed Trades Table / Empty State' },
  { line: 1247, name: '"Log Missed Trade" Modal Box' },
  { line: 1425, name: 'Notes Section / Editor Wrapper' },
  { line: 1471, name: 'Reference Empty State / Container' }
];

let replaced = 0;
let results = [];

targets.forEach(target => {
  let found = false;
  for (let offset = -5; offset <= 5; offset++) {
    const idx = target.line - 1 + offset;
    if (idx >= 0 && idx < lines.length && lines[idx].includes('rounded-2xl')) {
      const before = lines[idx].trim();
      lines[idx] = lines[idx].replace('rounded-2xl', 'rounded-xl');
      const after = lines[idx].trim();
      results.push(`- **${target.name}**\n  *Before:* \`${before}\`\n  *After:* \`${after}\``);
      found = true;
      replaced++;
      break;
    }
  }
  if (!found) {
    console.log(`Failed to find rounded-2xl near line ${target.line} for ${target.name}`);
  }
});

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log(`Successfully replaced ${replaced} instances.`);
console.log('\n--- Changes ---');
console.log(results.join('\n\n'));
