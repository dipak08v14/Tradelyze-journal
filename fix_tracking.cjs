const fs = require('fs');
const file = 'src/pages/TradeTrackingPage.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const targets = [
  { line: 73, name: '"Trade Not Found" Error Box' },
  { line: 1275, name: '"Fetch Error" Box' }
];

let replaced = 0;
let results = [];

targets.forEach(target => {
  let found = false;
  for (let offset = -5; offset <= 5; offset++) {
    const idx = target.line - 1 + offset;
    if (idx >= 0 && idx < lines.length && lines[idx].includes('rounded-2xl')) {
      const before = lines[idx].trim();
      lines[idx] = lines[idx].replace(/rounded-2xl/g, 'rounded-xl');
      const after = lines[idx].trim();
      results.push(`- **${target.name}**\n  *Before:* \`${before}\`\n  *After:* \`${after}\``);
      found = true;
      replaced++;
      break; // Move to next target
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
