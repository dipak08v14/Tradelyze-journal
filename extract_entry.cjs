const fs = require('fs');
const lines = fs.readFileSync('src/pages/TradeEntryPage.tsx', 'utf8').split('\n');
let count = 0;

for (let i = 0; i < lines.length; i++) {
  // Look for any div or section that has border styling (indicative of major sections that were fixed)
  const isWrapper = lines[i].includes('var(--card)') || lines[i].includes('border');
  
  if (isWrapper) {
    if (lines[i].includes('text-[11px]') || lines[i].includes('minHeight:') || lines[i].includes('hover:border') || lines[i].includes('text-xs')) continue; // Skip inputs/pills/buttons
    if (lines[i].includes('placeholder=') || lines[i].includes('type="text"')) continue; // skip actual input tags
    
    // Most major wrappers will have rounded-xl or inline borderRadius
    let rMatch = lines[i].match(/borderRadius:\s*'([^']+)'/) || lines[i].match(/rounded-[a-z0-9]+/);
    let radius = rMatch ? (rMatch[0].includes('borderRadius') ? 'inline ' + rMatch[1] : rMatch[0]) : 'none';
    
    let bMatch = lines[i].match(/border(?:Color)?:\s*'([^']+)'/) || lines[i].match(/border-\[([^\]]+)\]/) || lines[i].match(/\bborder\b/);
    let border = 'unknown';
    if (bMatch) {
       border = bMatch[0].includes('border:') || bMatch[0].includes('borderColor:') ? 'inline ' + bMatch[1] : bMatch[0];
    }
    
    // Only capture things that have some border radius or border styling (cards)
    if (radius === 'none' && border === 'unknown') continue;
    
    // Ignore purely structural lines that don't look like styled UI elements (e.g., border-b only)
    if (border === 'border' && radius === 'none' && !lines[i].includes('var(--card)')) continue;
    
    // Major wrappers often have p-6, p-5, p-4, p-8
    let padding = lines[i].match(/\bp-\d\b/) || lines[i].match(/padding:\s*'([^']+)'/);
    if (!padding && !lines[i].includes('var(--card)')) continue;

    let ctx = lines.slice(Math.max(0, i - 15), i).join('\n');
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g) || ctx.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/<[^>]+>/g, '').replace(/\/\*|\*\//g, '').trim() : 'Unknown';

    // Remove some noise from the title
    if (title.length > 60) title = title.substring(0, 60) + '...';

    // Avoid clustering the same line multiple times
    console.log('- [' + title + '] (~Line ' + (i+1) + ')');
    console.log('  Radius: ' + radius + ' | Border: ' + border);
    console.log('  Code snippet: ' + lines[i].trim().substring(0, 100));
    count++;
  }
}
