const fs = require('fs');
const file = 'src/pages/SettingsPage.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const targets = [
  { line: 1548, name: '"Disconnect" active broker button' },
  { line: 1585, name: '"Connect Data (CSV)" button' },
  { line: 1607, name: '"Confirm Import" inner button' },
  { line: 1628, name: '"Confirm Disconnect" inner button' },
  { line: 1980, name: 'CSV Import Modal: "Click to upload CSV" target area' },
  { line: 2224, name: 'CSV Import Modal: "Start Upload" button' },
  { line: 1997, name: 'CSV Import Modal: "Required format for each column" table wrapper' },
  { line: 2181, name: 'CSV Import Modal: "Ready to import Preview" table wrapper' }
];

let replaced = 0;
let results = [];

targets.forEach(target => {
  let found = false;
  for (let offset = -5; offset <= 5; offset++) {
    const idx = target.line - 1 + offset;
    if (idx >= 0 && idx < lines.length && lines[idx].includes('rounded-lg')) {
      const before = lines[idx].trim();
      lines[idx] = lines[idx].replace(/rounded-lg/g, 'rounded-xl');
      const after = lines[idx].trim();
      results.push(`- **${target.name}**\n  *Before:* \`${before}\`\n  *After:* \`${after}\``);
      found = true;
      replaced++;
      break; // Move to next target
    }
  }
  if (!found) {
    console.log(`Failed to find rounded-lg near line ${target.line} for ${target.name}`);
  }
});

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log(`Successfully replaced ${replaced} instances.`);
console.log('\n--- Changes ---');
console.log(results.join('\n\n'));
