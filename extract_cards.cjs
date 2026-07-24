const fs = require('fs');
const lines = fs.readFileSync('src/pages/TradeTrackingPage.tsx', 'utf8').split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('var(--card)') && lines[i].includes('border')) {
    if (lines[i].includes('minHeight:') || lines[i].includes('hover:border') || lines[i].includes('text-[11px]') || lines[i].includes('text-[12px]')) continue; // Skip inputs/pills
    if (lines[i].length < 50) continue; // skip single line basic things if they are small
    
    let ctx = lines.slice(Math.max(0, i - 15), i).join('\n');
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/\/\*|\*\//g, '').trim() : 'Unknown';

    let rMatch = lines[i].match(/borderRadius:\s*'([^']+)'/) || lines[i].match(/rounded-[a-z0-9]+/);
    let radius = rMatch ? (rMatch[0].includes('borderRadius') ? 'inline ' + rMatch[1] : rMatch[0]) : 'none';
    
    let bMatch = lines[i].match(/border(?:Color)?:\s*'([^']+)'/);
    let border = bMatch ? 'inline ' + bMatch[1] : 'unknown';
    
    if (radius === 'none' && border === 'unknown') continue;

    console.log('- [' + title + '] (~Line ' + (i+1) + ')');
    console.log('  Radius: ' + radius + ' | Border: ' + border);
    count++;
  }
}
