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
  let tab = 'GLOBAL / SIDEBAR';
  for (let i = 0; i < tabs.length; i++) {
    if (lineNum >= tabs[i].start) tab = tabs[i].name;
  }
  return tab;
}

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

let results = {};
matches.forEach(m => {
  const isCard = m.style.includes('var(--card)') || m.style.includes('var(--row)') || m.className.includes('bg-[var(--card)]') || m.className.includes('bg-[var(--row)]') || (m.className.includes('rounded-') && (m.style.includes('border') || m.className.includes('border')));
  
  if (isCard) {
    if (m.tag.includes('padding: \'6px 10px\'')) return;
    if (m.tag.includes('text-[10px]')) return;
    if (m.tag.includes('w-6 h-6') || m.tag.includes('w-4 h-4') || m.tag.includes('w-5 h-5') || m.tag.includes('w-8 h-8')) return;
    if (m.tag.includes('w-10 h-10') || m.tag.includes('w-12 h-12')) return; // icons/avatars
    if (m.tag.includes('w-20 h-20') || m.tag.includes('w-24 h-24')) return; // avatars
    if (m.tag.includes('rounded-full')) return;
    if (m.tag.includes('cursor-pointer') && m.tag.includes('text-center') && m.tag.length < 200) return; // likely buttons
    if (m.tag.includes('badge')) return;
    if (m.tag.includes('type="text"')) return;
    
    // Require it to be a block/wrapper level class
    if (!m.tag.includes('rounded-xl') && !m.tag.includes('rounded-2xl') && !m.tag.includes('rounded-lg') && !m.tag.includes('borderRadius')) return;
    
    // Exclude tabs navigation container
    if (m.className.includes('flex flex-col gap-1')) return;
    
    const lineNum = content.substring(0, m.index).split('\n').length;
    let tab = getTab(lineNum);
    
    let ctx = content.substring(Math.max(0, m.index - 200), m.index);
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
    if (!color && m.style.match(/borderColor/)) {
        let bcMatch = m.style.match(/borderColor:\s*'([^']+)'/);
        if (bcMatch) color = 'inline ' + bcMatch[1];
    }
    if (!color) color = 'none';

    if (!results[tab]) results[tab] = [];
    
    let exists = results[tab].find(r => r.title === title && Math.abs(r.line - lineNum) < 10);
    if (!exists) {
      results[tab].push(`- [${title}] (Line ${lineNum})\n  Radius: ${radius}\n  Border: ${color}`);
    }
  }
});

for (let tab in results) {
  console.log(`\n============== TAB: ${tab} ==============`);
  console.log(results[tab].join('\n\n'));
}
