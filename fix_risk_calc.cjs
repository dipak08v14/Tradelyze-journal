const fs = require('fs');
const file = 'src/pages/RiskCalculatorPage.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const targets = [
  { line: 161, name: 'Account Details section', search: '1px solid rgba(0,0,0,0.06)', replace: '1px solid var(--border)' },
  { line: 270, name: 'Setup Details section', search: '1px solid rgba(0,0,0,0.06)', replace: '1px solid var(--border)' },
  { line: 429, name: 'Results Card (Border)', search: '1px solid rgba(0,0,0,0.08)', replace: '1px solid var(--border)' },
  { line: 429, name: 'Results Card (Radius)', search: 'borderRadius: \'16px\'', replace: 'borderRadius: \'12px\'' }
];

let replaced = 0;
let results = [];

targets.forEach(target => {
  let found = false;
  for (let offset = -5; offset <= 5; offset++) {
    const idx = target.line - 1 + offset;
    if (idx >= 0 && idx < lines.length && lines[idx].includes(target.search)) {
      const before = lines[idx].trim();
      lines[idx] = lines[idx].replace(target.search, target.replace);
      const after = lines[idx].trim();
      results.push(`- **${target.name}**\n  *Before:* \`${before}\`\n  *After:* \`${after}\``);
      found = true;
      replaced++;
      break; // Move to next target
    }
  }
  if (!found) {
    console.log(`Failed to find ${target.search} near line ${target.line} for ${target.name}`);
  }
});

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log(`Successfully replaced ${replaced} instances.`);
console.log('\n--- Changes ---');
console.log(results.join('\n\n'));
