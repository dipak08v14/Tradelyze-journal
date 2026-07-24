const fs = require('fs');
const lines = fs.readFileSync('src/pages/DailyJournal.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if ((line.includes('var(--card)') && (line.includes('rounded') || line.includes('border'))) || 
      (line.includes('rounded-') && line.includes('border'))) {
    
    if (line.includes('<button') || line.includes('<input') || line.includes('<select')) continue;
    if (line.includes('text-[10px]') || line.includes('px-2 py-0.5') || line.includes('badge')) continue;
    if (line.includes("padding: '6px 10px'") && line.includes("fontSize: '11px'")) continue;
    if (line.includes('rounded-md py-1 px-2')) continue;
    if (line.includes('w-6 h-6 rounded-md') || line.includes('w-4 h-4')) continue;
    if (line.includes('rounded-full')) continue;
    if (line.includes('KPI') || line.includes('Summary cards')) continue;
    
    let brMatch = line.match(/rounded-(xl|2xl|lg|md|sm)/);
    let brInline = line.match(/borderRadius: '([^']+)'/);
    let radius = '';
    if (brMatch) radius += brMatch[0];
    if (brInline) radius += (radius ? ' + ' : '') + "inline " + brInline[1];
    if (!radius) radius = 'none';

    let bcMatch = line.match(/border-\[([^\]]+)\]/);
    let bcInline = line.match(/border: '([^']+)'/);
    let color = '';
    if (bcMatch) color += bcMatch[0];
    if (bcInline) color += (color ? ' + ' : '') + "inline " + bcInline[1];
    
    if (!color && line.includes('border ')) color = 'tailwind-default (border)';
    if (!color) color = 'none';

    let ctx = lines.slice(Math.max(0, i - 15), i).join('\n');
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/\/\*|\*\//g, '').trim() : 'Unknown Wrapper';

    console.log(`- [${title}] (Line ${i + 1})`);
    console.log(`  Radius: ${radius}`);
    console.log(`  Border:  ${color}`);
    console.log(`  Code: ${line.trim().substring(0, 150)}...`);
    console.log('');
  }
}
