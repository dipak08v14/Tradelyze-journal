const fs = require('fs');
const content = fs.readFileSync('src/pages/RiskCalculatorPage.tsx', 'utf8');

// Find all multiline `style={{...}}` blocks
let matches = [];
let regex = /<(div|section)[^>]*style=\{\{([^}]*)\}\}[^>]*>|<(div|section)[^>]*className="([^"]+)"[^>]*>/g;
let match;
while ((match = regex.exec(content)) !== null) {
  matches.push({
    index: match.index,
    tag: match[0],
    style: match[2] || '',
    className: match[4] || ''
  });
}

let results = [];
matches.forEach(m => {
  const isCard = m.style.includes('var(--card)') || m.style.includes('var(--row)') || m.className.includes('bg-[var(--bar)]') || m.className.includes('bg-[var(--row)]');
  const hasBorder = m.style.includes('border') || m.className.includes('border');
  
  if (isCard && hasBorder) {
    if (m.tag.includes('padding: \'6px 10px\'')) return;
    if (m.tag.includes('text-[10px]')) return;
    if (m.tag.includes('w-6 h-6') || m.tag.includes('w-4 h-4')) return;
    
    // Line number
    const lineNum = content.substring(0, m.index).split('\n').length;
    
    let ctx = content.substring(Math.max(0, m.index - 300), m.index);
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/\/\*|\*\//g, '').trim() : 'Unknown Wrapper';
    
    let radiusMatch = m.style.match(/borderRadius:\s*'([^']+)'/) || m.style.match(/borderRadius:\s*(\d+)/);
    let radiusClass = m.className.match(/rounded-([^ \"]+)/);
    let radius = '';
    if (radiusClass) radius += 'rounded-' + radiusClass[1];
    if (radiusMatch) radius += (radius ? ' + ' : '') + 'inline ' + radiusMatch[1];
    if (!radius) radius = 'none';

    let borderMatch = m.style.match(/border:\s*'([^']+)'/);
    let borderClass = m.className.match(/border-\[([^\]]+)\]/) || m.className.match(/\bborder\b/);
    let color = '';
    if (borderClass) color += borderClass[0];
    if (borderMatch) color += (color ? ' + ' : '') + 'inline ' + borderMatch[1];
    if (!color) color = 'none';

    results.push(`- [${title}] (Line ${lineNum})\n  Radius: ${radius}\n  Border: ${color}`);
  }
});

console.log(results.join('\n\n'));
