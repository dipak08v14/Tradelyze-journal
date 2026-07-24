const fs = require('fs');
const file = 'src/pages/SettingsPage.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const tabs = [
  { name: 'ACCOUNT PROFILE', start: 984 },
  { name: 'APPEARANCE', start: 1656 },
  { name: 'SUBSCRIPTION', start: 1739 },
  { name: 'NOTIFICATIONS', start: 1834 },
  { name: 'MODALS (Delete / Add Broker / CSV Import)', start: 1891 }
];

function getTab(lineNum) {
  let tab = 'GLOBAL / SIDEBAR';
  for (let i = 0; i < tabs.length; i++) {
    if (lineNum >= tabs[i].start) tab = tabs[i].name;
  }
  return tab;
}

let results = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  let type = '';

  if (line.includes('<button') || (line.includes('cursor-pointer') && line.includes('onClick'))) {
    type = 'Button';
  } else if (line.includes('<input') || line.includes('<select') || line.includes('<textarea')) {
    type = 'Input Field';
  } else if (line.includes('rounded-') || line.includes('borderRadius:')) {
    type = 'Small Block / Wrapper';
  }

  if (type) {
    let radius = 'none';
    let rm = line.match(/rounded-([^ \"']+)/);
    let rmin = line.match(/borderRadius:\s*'([^']+)'/) || line.match(/borderRadius:\s*(\d+px|\d+)/);
    if (rm) radius = 'rounded-' + rm[1];
    else if (rmin) radius = 'inline ' + rmin[1];

    let color = 'none';
    let bm = line.match(/border-\[([^\]]+)\]/) || line.match(/border-[a-z]+-\d+(?:\/\d+)?/);
    let bmin = line.match(/border:\s*'([^']+)'/) || line.match(/borderColor:\s*'([^']+)'/);
    if (bm) color = bm[0];
    else if (bmin) color = 'inline ' + bmin[1];
    else if (line.match(/className="[^"]*\bborder\b[^"]*"/)) color = 'var(--border) (implied via border class)';

    // Ignore major wrappers that have p-6 and bg-[var(--card)] which we already reported
    if (line.includes('p-6') && line.includes('var(--card)')) continue;
    // Ignore unstyled divs
    if (radius === 'none' && color === 'none' && type === 'Small Block / Wrapper') continue;
    if (radius === 'rounded-full') continue;

    let ctx = lines.slice(Math.max(0, i - 15), i).join('\n');
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g) || ctx.match(/<label[^>]*>([^<]+)<\/label>/g) || ctx.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/<[^>]+>/g, '').replace(/\/\*|\*\//g, '').trim() : 'Unnamed';

    // Simplify titles
    if (title.length > 50) title = title.substring(0, 50) + '...';

    let tab = getTab(lineNum);
    if (!results[tab]) results[tab] = [];
    
    // De-dupe identical lines closely clustered
    const desc = `*   **${type}**: ${title} (~L${lineNum})\n    *   Radius: \`${radius}\` | Border: \`${color}\``;
    if (!results[tab].find(r => Math.abs(r.line - lineNum) < 4 && r.type === type && r.radius === radius && r.color === color)) {
        results[tab].push({ line: lineNum, type, radius, color, desc });
    }
  }
}

let output = [];
for (let tab in results) {
  output.push(`### ${tab}`);
  results[tab].forEach(r => {
    output.push(r.desc);
  });
  output.push('');
}
fs.writeFileSync('settings_small.md', output.join('\n'));
console.log('Saved to settings_small.md');
