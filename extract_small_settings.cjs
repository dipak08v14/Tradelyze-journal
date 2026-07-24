const fs = require('fs');
const file = 'src/pages/SettingsPage.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const tabs = [
  { name: 'ACCOUNT_PROFILE', start: 984 },
  { name: 'APPEARANCE', start: 1656 },
  { name: 'SUBSCRIPTION', start: 1739 },
  { name: 'NOTIFICATIONS', start: 1834 }
];

function getTab(lineNum) {
  let tab = 'GLOBAL / SIDEBAR / OTHER';
  for (let i = 0; i < tabs.length; i++) {
    if (lineNum >= tabs[i].start) tab = tabs[i].name;
  }
  return tab;
}

let results = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // We want to catch <button>, <input>, and any <div or <span with 'rounded-'
  let isTarget = false;
  let type = '';

  if (line.includes('<button') || (line.includes('cursor-pointer') && line.includes('text-center') && line.includes('onClick'))) {
    isTarget = true;
    type = 'Button';
  } else if (line.includes('<input') || line.includes('<select') || line.includes('<textarea')) {
    isTarget = true;
    type = 'Input Field';
  } else if (line.includes('rounded-') || line.includes('borderRadius:')) {
    // Only capture small UI elements not previously fixed.
    // In previous fixes we changed all rounded-2xl to rounded-xl.
    // Major wrappers usually have bg-[var(--card)] or var(--card) or p-6.
    isTarget = true;
    type = 'Small UI Box / Pill / Inner Card';
  }
  
  if (isTarget) {
    // Attempt to extract radius
    let radiusMatch = line.match(/rounded-([^ \"']+)/) || line.match(/borderRadius:\s*'([^']+)'/) || line.match(/borderRadius:\s*(\d+px|\d+)/);
    let radius = radiusMatch ? radiusMatch[0] : 'none';
    
    // Attempt to extract border color
    let borderMatch = line.match(/border-\[([^\]]+)\]/) || line.match(/border-[a-z]+-\d+(?:\/\d+)?/) || line.match(/border:\s*'([^']+)'/) || line.match(/borderColor:\s*'([^']+)'/);
    let color = '';
    if (borderMatch) color = borderMatch[0];
    else if (line.includes('border') && !line.includes('border-transparent') && !line.includes('border-none') && !line.includes('border-t') && !line.includes('border-b') && !line.includes('border-l') && !line.includes('border-r')) {
      if (line.match(/className="[^"]*\bborder\b[^"]*"/)) color = 'tailwind default (border)';
    }
    if (!color) color = 'none';

    // Discard false positives or already reported wrappers
    // Ignore the major wrappers we just fixed (e.g. p-6 rounded-xl bg-[var(--card)])
    if (line.includes('p-6') && line.includes('var(--card)')) continue;
    // Ignore completely unstyled wrapper divs
    if (radius === 'none' && color === 'none' && type !== 'Input Field' && type !== 'Button') continue;

    const lineNum = i + 1;
    let tab = getTab(lineNum);
    
    // Context name
    let ctx = lines.slice(Math.max(0, i - 15), i).join('\n');
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g) || ctx.match(/<label[^>]*>([^<]+)<\/label>/g) || ctx.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/<[^>]+>/g, '').replace(/\/\*|\*\//g, '').trim() : 'Unknown';

    if (!results[tab]) results[tab] = [];
    
    let description = `${type} [${title}] (Line ${lineNum}) -> Radius: ${radius}, Border: ${color}`;
    
    // Avoid spamming identical consecutive lines if they are part of the same block
    if (!results[tab].find(r => Math.abs(r.line - lineNum) < 3 && r.desc === description)) {
      results[tab].push({ line: lineNum, desc: description, raw: line.trim() });
    }
  }
}

for (let tab in results) {
  console.log(`\n============== ${tab} ==============`);
  results[tab].forEach(r => {
    console.log(`- ${r.desc}`);
    console.log(`  Raw: \`${r.raw}\``);
  });
}
