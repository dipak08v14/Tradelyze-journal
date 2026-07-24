const fs = require('fs');

function extractWrappers(filePath, tabDefs = null) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let tabs = [];
  if (tabDefs) {
    tabs = tabDefs.map(t => ({
      name: t.name,
      start: lines.findIndex(l => l.includes(t.pattern))
    }));
    tabs.sort((a,b) => a.start - b.start);
  }

  function getTabForLine(lineIdx) {
    if (!tabDefs) return 'GLOBAL';
    let activeTab = 'UNKNOWN';
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].start !== -1 && lineIdx >= tabs[i].start) {
        activeTab = tabs[i].name;
      }
    }
    return activeTab;
  }

  let matches = [];
  let regex = /<(div|section)[^>]*style=\{\{([^}]*)\}\}[^>]*>|<(div|section)[^>]*className="([^"]+)"[^>]*>/g;
  let match;
  
  // We'll also do a line-by-line check because regex over multiline jsx can be brittle, but the multiline regex worked decently well for inline styles. 
  // Wait, let's do line-by-line first, but handling multiline classNames/styles is safer with a robust regex or just manual inspection.
  // Actually, let's just do line-by-line and look for `var(--card)`, `var(--row)`, `rounded-`, `border`.

  let results = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if ((line.includes('var(--card)') || line.includes('var(--row)')) || 
        (line.includes('rounded-') && (line.includes('border') || line.includes('boxShadow')))) {
      
      // Filter out small interactive/inline elements
      if (line.includes('<button') || line.includes('<input') || line.includes('<select')) continue;
      if (line.includes('text-[10px]') || line.includes('px-2 py-0.5') || line.includes('badge')) continue;
      if (line.includes("padding: '6px 10px'") && line.includes("fontSize: '11px'")) continue;
      if (line.includes('rounded-md py-1 px-2')) continue;
      if (line.includes('w-6 h-6') || line.includes('w-4 h-4') || line.includes('w-8 h-8')) continue;
      if (line.includes('rounded-full')) continue;
      if (line.includes('KPI') || line.includes('Summary cards')) continue;
      
      // Additional small filters
      if (line.includes('w-2 h-2') || line.includes('w-3 h-3')) continue;

      let brMatch = line.match(/rounded-(xl|2xl|lg|md|sm)/);
      let brInline = line.match(/borderRadius:\s*'([^']+)'/);
      let radius = '';
      if (brMatch) radius += brMatch[0];
      if (brInline) radius += (radius ? ' + ' : '') + "inline " + brInline[1];
      if (!radius) radius = 'none';

      let bcMatch = line.match(/border-\[([^\]]+)\]/);
      let bcInline = line.match(/border:\s*'([^']+)'/);
      let color = '';
      if (bcMatch) color += bcMatch[0];
      if (bcInline) color += (color ? ' + ' : '') + "inline " + bcInline[1];
      if (!color && line.includes('border ')) color = 'tailwind-default (border)';
      if (!color) color = 'none';

      let tab = getTabForLine(i);
      if (!results[tab]) results[tab] = [];
      
      let ctx = lines.slice(Math.max(0, i - 15), i).join('\n');
      let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g);
      let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/\/\*|\*\//g, '').trim() : 'Unknown Wrapper';
      
      // Prevent duplicates on same line
      results[tab].push({ line: i + 1, code: line.trim().substring(0, 150), title, radius, color });
    }
  }

  return results;
}

console.log('--- StrategiesPage.tsx ---');
const spRes = extractWrappers('src/pages/StrategiesPage.tsx');
for (let tab in spRes) {
  spRes[tab].forEach(r => {
    console.log(`- [${r.title}] (Line ${r.line})`);
    console.log(`  Radius: ${r.radius}`);
    console.log(`  Border: ${r.color}`);
  });
}

console.log('\n--- StrategyDetail.tsx ---');
const sdTabs = [
  { name: 'OVERVIEW', pattern: "activeTab === 'overview'" },
  { name: 'RULES_PERFORMANCE', pattern: "activeTab === 'rules'" },
  { name: 'EXECUTED_TRADES', pattern: "activeTab === 'executed'" },
  { name: 'MISSED_TRADES', pattern: "activeTab === 'missed'" },
  { name: 'NOTES', pattern: "activeTab === 'notes'" },
  { name: 'REFERENCE', pattern: "activeTab === 'reference'" },
  { name: 'FALLBACK', pattern: "PLACEHOLDER FOR" }
];
const sdRes = extractWrappers('src/pages/StrategyDetail.tsx', sdTabs);
for (let tab in sdRes) {
  console.log(`\n============== TAB: ${tab} ==============`);
  sdRes[tab].forEach(r => {
    console.log(`- [${r.title}] (Line ${r.line})`);
    console.log(`  Radius: ${r.radius}`);
    console.log(`  Border: ${r.color}`);
  });
}
