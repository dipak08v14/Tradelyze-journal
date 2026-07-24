const fs = require('fs');
const lines = fs.readFileSync('src/pages/AdvancedReports.tsx', 'utf8').split('\n');

const tabs = [
  { name: 'OVERVIEW', start: lines.findIndex(l => l.includes("activeTab === 'OVERVIEW'")) },
  { name: 'DETAILED', start: lines.findIndex(l => l.includes("activeTab === 'DETAILED'")) },
  { name: 'RISK', start: lines.findIndex(l => l.includes("activeTab === 'RISK'")) },
  { name: 'WINS_LOSSES', start: lines.findIndex(l => l.includes("activeTab === 'WINS_LOSSES'")) },
  { name: 'MARKET_BEHAVIOR', start: lines.findIndex(l => l.includes("activeTab === 'MARKET_BEHAVIOR'")) },
  { name: 'CALENDAR', start: lines.findIndex(l => l.includes("// PLACEHOLDERS FOR REMAINING TABS")) }
];

tabs.sort((a,b) => a.start - b.start);

function getTabForLine(lineIdx) {
  let activeTab = 'UNKNOWN';
  for (let i = 0; i < tabs.length; i++) {
    if (tabs[i].start !== -1 && lineIdx >= tabs[i].start) {
      activeTab = tabs[i].name;
    }
  }
  return activeTab;
}

let results = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('var(--card)') && (line.includes('border') || line.includes('boxShadow') || line.includes('rounded'))) {
    if (line.includes('text-[10px]') || line.includes('badge') || line.includes('px-2 py-0.5') || line.includes('flex gap-2') || line.includes('bg-[var(--card)] px-3')) continue;
    if (line.includes("padding: '6px 10px'") && line.includes("fontSize: '11px'")) continue;
    if (line.includes("borderRadius: '6px'") && line.includes("fontSize: '11px'")) continue;
    if (line.includes('rounded-md py-1 px-2')) continue;
    if (line.includes('KPI') || line.includes('Summary cards')) continue;
    if (line.includes('<button') || line.includes('<select') || line.includes('dropdown')) continue;

    let tab = getTabForLine(i);
    if (!results[tab]) results[tab] = [];
    
    results[tab].push({ line: i + 1, code: line.trim() });
  }
}

for (let tab in results) {
  console.log('\n============== TAB: ' + tab + ' ==============');
  results[tab].forEach(res => {
    let brMatch = res.code.match(/rounded-(xl|2xl|lg|md|sm)/);
    let brInline = res.code.match(/borderRadius: '([^']+)'/);
    let radius = '';
    if (brMatch) radius += brMatch[0];
    if (brInline) radius += (radius ? ' + ' : '') + "inline " + brInline[1];
    if (!radius) radius = 'none';

    let bcMatch = res.code.match(/border-\[([^\]]+)\]/);
    let bcInline = res.code.match(/border: '([^']+)'/);
    let color = '';
    if (bcMatch) color += bcMatch[0];
    if (bcInline) color += (color ? ' + ' : '') + "inline " + bcInline[1];
    if (!color) color = 'none';

    let ctx = lines.slice(Math.max(0, res.line - 15), res.line).join('\n');
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/\/\*|\*\//g, '').trim() : 'Unknown Wrapper';

    console.log(`- [${title}] (Line ${res.line})`);
    console.log(`  Border-Radius: ${radius}`);
    console.log(`  Border-Color:  ${color}`);
  });
}
