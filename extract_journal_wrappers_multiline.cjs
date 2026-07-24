const fs = require('fs');
const content = fs.readFileSync('src/pages/DailyJournal.tsx', 'utf8');
const lines = content.split('\n');

// Find all `style={{...}}` blocks that contain `var(--card)` or `border` or `borderRadius` on wrappers.
// Actually, it's easier to just search for `var(--card)` and `border` across all lines.
const targets = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('backgroundColor: \'var(--card)\'') || lines[i].includes('border:') || lines[i].includes('className="') || lines[i].includes('borderRadius:')) {
    // wait, checking every line is tedious. Let's just find the divs manually by scanning through the component.
  }
}

// Better approach: regex over the entire file to find `<div` or `<section` with a `style={{...}}`
// that spans multiple lines.
let matches = [];
let regex = /<(div|section)[^>]*style=\{\{([^}]*)\}\}[^>]*>/g;
let match;
while ((match = regex.exec(content)) !== null) {
  matches.push({
    index: match.index,
    tag: match[0],
    style: match[2]
  });
}

matches.forEach(m => {
  // We only care about wrappers (background var(--card) or var(--row), or has border/radius)
  if (m.style.includes('var(--card)') || m.style.includes('var(--row)') || m.style.includes('border') || m.style.includes('borderRadius')) {
    // filter out tooltips, badges, buttons, etc.
    if (m.tag.includes('padding: \'6px 10px\'')) return;
    if (m.tag.includes('text-[10px]')) return;
    if (m.tag.includes('w-6 h-6') || m.tag.includes('w-4 h-4')) return;
    
    // Determine line number
    const lineNum = content.substring(0, m.index).split('\n').length;
    
    // Determine what it is
    let ctx = content.substring(Math.max(0, m.index - 500), m.index);
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/\/\*|\*\//g, '').trim() : 'Unknown Wrapper';

    let radiusMatch = m.tag.match(/borderRadius:\s*'([^']+)'/);
    let radiusClass = m.tag.match(/className="[^"]*rounded-([^ "\}]+)[^"]*"/);
    let radius = '';
    if (radiusClass) radius += 'rounded-' + radiusClass[1];
    if (radiusMatch) radius += (radius ? ' + ' : '') + 'inline ' + radiusMatch[1];
    if (!radius) radius = 'none';

    let borderMatch = m.tag.match(/border:\s*(isHighlighted \? [^:]+ : )?'([^']+)'/);
    let borderClass = m.tag.match(/className="[^"]*border-\[[^\]]+\][^"]*"/);
    let border = '';
    if (borderClass) border += borderClass[0];
    if (borderMatch) border += (border ? ' + ' : '') + 'inline ' + borderMatch[2];
    if (!border && m.tag.includes('className="') && m.tag.includes('border ')) border = 'tailwind-default (border)';
    if (!border) border = 'none';

    console.log(`- [${title}] (Line ${lineNum})`);
    console.log(`  Radius: ${radius}`);
    console.log(`  Border:  ${border}`);
  }
});
