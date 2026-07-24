const fs = require('fs');
const file = 'src/pages/TradeTrackingPage.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Find all multiline `style={{...}}` blocks or div/section with classes
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
  const isCard = m.style.includes('var(--card)') || m.style.includes('var(--row)') || m.className.includes('bg-[var(--card)]') || m.className.includes('bg-[var(--row)]') || (m.className.includes('rounded-') && (m.style.includes('border') || m.className.includes('border')));
  
  if (isCard) {
    // Filters for small interactive/inline elements
    if (m.tag.includes('padding: \'6px 10px\'')) return;
    if (m.tag.includes('text-[10px]') || m.tag.includes('px-2 py-0.5') || m.tag.includes('badge')) return;
    if (m.tag.includes('w-6 h-6') || m.tag.includes('w-4 h-4') || m.tag.includes('w-8 h-8')) return;
    if (m.tag.includes('w-12 h-12')) return;
    if (m.tag.includes('rounded-full')) return;
    if (m.tag.includes('cursor-pointer') && m.tag.includes('text-center') && m.tag.length < 200) return; // likely buttons
    if (m.tag.includes('hover:bg-[var(--row)]')) return;
    
    // Exclude basic layout stuff without borders or explicit card styling
    if (!m.style.includes('var(--card)') && !m.className.includes('bg-[var(--card)]') && !m.className.includes('border')) return;

    // Require it to be a block/wrapper level class
    if (!m.tag.includes('rounded-xl') && !m.tag.includes('rounded-2xl') && !m.tag.includes('rounded-lg') && !m.tag.includes('borderRadius')) return;

    let lineNum = content.substring(0, m.index).split('\n').length;
    let ctx = content.substring(Math.max(0, m.index - 300), m.index);
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/\/\*|\*\//g, '').trim() : 'Unknown Wrapper';
    
    // Avoid small filter boxes if they aren't major cards
    if (title.toLowerCase().includes('filter') && !m.className.includes('p-6')) {
       // Keep them but mark them maybe? Just keep them, the user said "major content cards only". Let's see if we can filter out the really small ones
       if (m.tag.length < 100) return;
    }

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
    if (!color && m.style.match(/borderColor/)) {
        let bcMatch = m.style.match(/borderColor:\s*'([^']+)'/);
        if (bcMatch) color = 'inline ' + bcMatch[1];
    }
    if (!color) color = 'none';

    let exists = results.find(r => r.title === title && Math.abs(r.line - lineNum) < 10);
    if (!exists) {
      results.push({ line: lineNum, title, radius, color, code: m.tag.trim() });
    }
  }
});

results.forEach(r => {
  console.log(`- [${r.title}] (Line ${r.line})`);
  console.log(`  Radius: ${r.radius}`);
  console.log(`  Border: ${r.color}`);
});
