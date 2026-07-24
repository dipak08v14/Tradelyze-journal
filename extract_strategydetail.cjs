const fs = require('fs');
const sdLines = fs.readFileSync('src/pages/StrategyDetail.tsx', 'utf8').split('\n');
const sdTabs = [
  { name: 'OVERVIEW', start: 708 },
  { name: 'RULES_PERFORMANCE', start: 882 },
  { name: 'EXECUTED_TRADES', start: 1023 },
  { name: 'MISSED_TRADES', start: 1122 },
  { name: 'NOTES', start: 1423 },
  { name: 'REFERENCE', start: 1461 }
];

function getTab(line) {
  let tab = 'GLOBAL / HEADER';
  for (let i = 0; i < sdTabs.length; i++) {
    if (line >= sdTabs[i].start) tab = sdTabs[i].name;
  }
  return tab;
}

let sdResults = {};
for (let i = 0; i < sdLines.length; i++) {
  const line = sdLines[i];
  if ((line.includes('var(--card)') || line.includes('var(--row)')) || 
      (line.includes('rounded-') && (line.includes('border') || line.includes('boxShadow')))) {
    
    // Ignore small elements
    if (line.includes('<button') || line.includes('<input') || line.includes('<select')) continue;
    if (line.includes('text-[10px]') || line.includes('px-2 py-0.5') || line.includes('badge')) continue;
    if (line.includes("padding: '6px 10px'")) continue; // tooltip
    if (line.includes('rounded-md py-1 px-2')) continue;
    if (line.includes('w-6 h-6') || line.includes('w-4 h-4') || line.includes('w-8 h-8')) continue;
    if (line.includes('w-12 h-12')) continue;
    if (line.includes('rounded-full')) continue;
    if (line.includes('KPI') || line.includes('Summary cards')) continue;
    if (line.includes('activeTab ===') || line.includes('setActiveTab')) continue;
    
    // Only capture ones that look like big cards/sections
    if (!line.includes('rounded-xl') && !line.includes('rounded-2xl') && !line.includes('rounded-lg') && !line.includes('borderRadius')) continue;

    let brMatch = line.match(/rounded-(xl|2xl|lg|md|sm)/);
    let brInline = line.match(/borderRadius:\s*'([^']+)'/);
    let radius = '';
    if (brMatch) radius += brMatch[0];
    if (brInline) radius += (radius ? ' + ' : '') + 'inline ' + brInline[1];
    if (!radius) radius = 'none';
    
    let bcMatch = line.match(/border-\[([^\]]+)\]/);
    let bcInline = line.match(/border:\s*(isHighlighted \? [^:]+ : )?'([^']+)'/);
    let borderClass = line.match(/className=\"[^\"]*border[^\"]*\"/);
    let color = '';
    if (bcMatch) color += bcMatch[0];
    if (bcInline) color += (color ? ' + ' : '') + 'inline ' + bcInline[2];
    if (!color && borderClass) color = 'tailwind-default (border)';
    if (!color) color = 'none';
    
    let tab = getTab(i+1);
    if (!sdResults[tab]) sdResults[tab] = [];
    
    let ctx = sdLines.slice(Math.max(0, i - 15), i).join('\n');
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/\/\*|\*\//g, '').trim() : 'Unknown Wrapper';
    
    // De-dupe slightly by title
    let exists = sdResults[tab].find(r => r.title === title && Math.abs(r.line - i) < 10);
    if (!exists) {
      sdResults[tab].push({ line: i+1, title, radius, color, code: line.trim() });
    }
  }
}

for (let tab in sdResults) {
  console.log('\n============== TAB: ' + tab + ' ==============');
  sdResults[tab].forEach(r => {
    console.log('- [' + r.title + '] (Line ' + r.line + ')');
    console.log('  Radius: ' + r.radius);
    console.log('  Border: ' + r.color);
  });
}
