const fs = require('fs');
const file = 'src/pages/AiTeacherPage.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const targets = [
  { line: 635, name: 'Specific Trade Select Box' },
  { line: 734, name: 'Quick Stats Panel Box' }
];

let replaced = 0;
let results = [];

targets.forEach(target => {
  let found = false;
  for (let offset = -5; offset <= 5; offset++) {
    const idx = target.line - 1 + offset;
    if (idx >= 0 && idx < lines.length && lines[idx].includes('1px solid rgba(0,0,0,0.06)')) {
      const before = lines[idx].trim();
      lines[idx] = lines[idx].replace('1px solid rgba(0,0,0,0.06)', '1px solid var(--border)');
      const after = lines[idx].trim();
      results.push(`- **${target.name}**\n  *Before:* \`${before}\`\n  *After:* \`${after}\``);
      found = true;
      replaced++;
      break; // Move to next target
    }
  }
  if (!found) {
    console.log(`Failed to find rgba border near line ${target.line} for ${target.name}`);
  }
});

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log(`Successfully replaced ${replaced} instances.`);
console.log('\n--- Changes ---');
console.log(results.join('\n\n'));
