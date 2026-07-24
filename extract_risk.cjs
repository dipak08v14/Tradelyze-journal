const fs = require('fs');
const lines = fs.readFileSync('src/pages/RiskCalculatorPage.tsx', 'utf8').split('\n');

console.log('--- RiskCalculatorPage.tsx ---');
let results = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if ((line.includes('var(--card)') || line.includes('var(--row)')) || 
      (line.includes('rounded-') && (line.includes('border') || line.includes('boxShadow')))) {
    
    // Filters for small interactive/inline elements
    if (line.includes('<button') || line.includes('<input') || line.includes('<select')) continue;
    if (line.includes('text-[10px]') || line.includes('px-2 py-0.5') || line.includes('badge')) continue;
    if (line.includes("padding: '6px 10px'")) continue;
    if (line.includes('rounded-md py-1 px-2')) continue;
    if (line.includes('w-6 h-6') || line.includes('w-4 h-4') || line.includes('w-8 h-8')) continue;
    if (line.includes('w-12 h-12')) continue;
    if (line.includes('rounded-full')) continue;
    if (line.includes('KPI') || line.includes('Summary cards')) continue;
    if (line.includes('cursor-pointer') && line.includes('text-center')) continue; // likely a button
    
    // Require it to be a block/wrapper level class
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
    if (!color && line.includes('borderColor')) {
      let bColorMatch = line.match(/borderColor:\s*'([^']+)'/);
      if (bColorMatch) color = 'inline ' + bColorMatch[1];
    }
    if (!color && line.includes('var(--border)')) color = 'var(--border) implied';
    if (!color) color = 'none';
    
    let ctx = lines.slice(Math.max(0, i - 15), i).join('\n');
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/\/\*|\*\//g, '').trim() : 'Unknown Wrapper';

    let exists = results.find(r => r.title === title && Math.abs(r.line - i) < 10);
    if (!exists) {
      results.push({ line: i+1, title, radius, color, code: line.trim() });
    }
  }
}

results.forEach(r => {
  console.log(`- [${r.title}] (Line ${r.line})`);
  console.log(`  Radius: ${r.radius}`);
  console.log(`  Border: ${r.color}`);
});
