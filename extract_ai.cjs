const fs = require('fs');
const lines = fs.readFileSync('src/pages/AiTeacherPage.tsx', 'utf8').split('\n');

console.log("Analyzing AiTeacherPage.tsx...");

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const isMajor = line.includes('var(--card)') || line.includes('border') || line.includes('rounded-2xl') || line.includes('rounded-xl') || line.includes('rounded-lg');
  
  if (isMajor) {
    if (line.includes('button') || line.includes('<button') || line.includes('cursor-pointer')) {
        // Only ignore obvious small buttons. If it's a huge wrapper with cursor pointer we might miss it, but let's assume buttons are small
        if (line.length < 150) continue; 
    }
    if (line.includes('input') || line.includes('<input') || line.includes('text-xs') || line.includes('w-10 h-10') || line.includes('rounded-full')) {
        if (!line.includes('message')) continue; // Messages might have small text, let's let them pass
    }

    let radius = 'none';
    let rMatch = line.match(/rounded-([a-z0-9]+)/);
    let rMatchInline = line.match(/borderRadius:\s*'([^']+)'/);
    if (rMatch) radius = rMatch[0];
    if (rMatchInline) radius = (radius === 'none' ? '' : radius + ' + ') + 'inline ' + rMatchInline[1];
    
    let border = 'none';
    let bMatch = line.match(/border(?:Color)?:\s*'([^']+)'/);
    let bMatchClass = line.match(/border-\[([^\]]+)\]/) || line.match(/border-[a-z]+-\d+(?:\/\d+)?/);
    
    if (bMatchClass) border = bMatchClass[0];
    else if (line.match(/\bborder\b/)) border = 'tailwind default (border)';
    
    if (bMatch) border = (border === 'none' ? '' : border + ' + ') + 'inline ' + bMatch[1];
    
    // Ignore lines that are just structural containers without visual card styles
    if (radius === 'none' && border === 'none' && !line.includes('var(--card)')) continue;
    // Ignore purely text styling
    if (line.match(/border-b\b/) && radius === 'none') continue;
    // We only want major wrappers - they usually have p-4, p-6, p-8, etc. or flex-1/min-h
    
    let ctx = lines.slice(Math.max(0, i - 15), i).join('\n');
    let titleMatch = ctx.match(/\{?\/\*\s*([^\*]+)\s*\*\/\}/g) || ctx.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/g);
    let title = titleMatch ? titleMatch[titleMatch.length - 1].replace(/<[^>]+>/g, '').replace(/\/\*|\*\//g, '').trim() : 'Unknown';

    if (title.length > 60) title = title.substring(0, 60) + '...';

    // Heuristic: If it has padding >= 3 or is a chat message bubble, print it
    if (line.match(/\bp-[3-8]\b/) || line.match(/padding:\s*'[^']+'/) || line.includes('message') || line.includes('var(--card)')) {
        console.log('- [' + title + '] (~Line ' + (i+1) + ')');
        console.log('  Radius: ' + radius + ' | Border: ' + border);
        console.log('  Code: ' + line.trim().substring(0, 100));
    }
  }
}
