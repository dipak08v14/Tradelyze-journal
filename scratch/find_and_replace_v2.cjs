const fs = require('fs');

const file = 'src/pages/AdvancedReports.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = /<tr style={{ borderBottom: '1px solid var\(--border\)', color: 'var\(--text-muted\)' }} className="text-\[11px\] font-mono uppercase tracking-wider bg-zinc-800\/10 dark:bg-zinc-100\/5">/g;

const target2 = /className={`\$\{\s*index % 2 === 1 \? 'bg-zinc-800\/5 dark:bg-zinc-100\/5' : 'bg-transparent'\s*\} hover:bg-zinc-800\/10 dark:hover:bg-zinc-100\/10 transition-colors text-xs font-sans`}/g;

const match1 = (content.match(target1) || []).length;
const match2 = (content.match(target2) || []).length;

console.log('Matches for Target 1:', match1);
console.log('Matches for Target 2:', match2);
