const fs = require('fs');
const file = 'src/pages/SettingsPage.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const targets = [
  { line: 930, name: 'Expired Subscription Warning Block' },
  { line: 991, name: 'Profile Details Card' },
  { line: 1076, name: 'Security Card' },
  { line: 1126, name: 'Account Management Card' },
  { line: 1166, name: 'Broker Integration Card' },
  { line: 1657, name: 'Visual Themes Customization Card' },
  { line: 1740, name: 'Subscription Details Card' },
  { line: 1748, name: 'Free Plan Inner Card' },
  { line: 1792, name: 'Pro Plan Inner Card' },
  { line: 1835, name: 'Notification Preferences Card' },
  { line: 1891, name: 'Delete Account Modal' },
  { line: 1937, name: 'Add Broker / Sync Modal' },
  { line: 2310, name: 'Rename Connection Modal' },
  { line: 2397, name: 'Copy Auth Token Modal Box' }
];

let replaced = 0;
let results = [];

// Since we are replacing all `rounded-2xl`, let's just loop over all lines
// and keep track of which target it matched.
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('rounded-2xl')) {
    const before = lines[i].trim();
    lines[i] = lines[i].replace(/rounded-2xl/g, 'rounded-xl');
    const after = lines[i].trim();
    
    // Find closest target
    let bestTarget = null;
    let minDiff = 999;
    targets.forEach(t => {
      const diff = Math.abs(t.line - (i + 1));
      if (diff < minDiff) {
        minDiff = diff;
        bestTarget = t;
      }
    });

    let name = bestTarget ? bestTarget.name : 'Unknown Wrapper';
    results.push(`- **${name}** (~L${i + 1})\n  *Before:* \`${before}\`\n  *After:* \`${after}\``);
    replaced++;
  }
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log(`Successfully replaced ${replaced} instances.`);
console.log('\n--- Changes ---');
console.log(results.join('\n\n'));
