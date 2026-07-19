const fs = require('fs');
const files = ['DashboardPage.tsx', 'TradingLogsPage.tsx', 'DailyJournal.tsx', 'TradeEntryPage.tsx', 'SettingsPage.tsx', 'AiTeacherPage.tsx', 'StrategiesPage.tsx', 'RiskCalculatorPage.tsx'];

let out = '';
files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  out += '=== ' + file + ' ===\n';
  
  const lines = content.split('\n');
  const seenClasses = new Set();
  const seenStyles = new Set();
  
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.includes('<div') || trimmed.includes('<section') || trimmed.includes('<article') || trimmed.includes('<aside') || trimmed.includes('<main') || trimmed.includes('<nav')) {
       if (trimmed.includes('rounded') || trimmed.includes('shadow')) {
          const match = trimmed.match(/className=(?:\{`|"|')([^`"']+)(?:`\}|"|')/);
          const styleMatch = trimmed.match(/style=\{\{(.*?)\}\}/);
          
          let approach = '';
          if (match) {
             const cls = match[1];
             const shadows = cls.split(/\s+/).filter(c => c.startsWith('shadow'));
             if (shadows.length) {
                approach = shadows.join(' ');
                if (!seenClasses.has(approach)) {
                   seenClasses.add(approach);
                   out += 'Tailwind: ' + approach + ' | Line ' + (i+1) + ': ' + trimmed.substring(0, 150) + '\n';
                }
             } else if ((cls.includes('bg-[var(--card)]') || cls.includes('bg-white')) && cls.includes('rounded')) {
                if (!seenClasses.has('No Tailwind Shadow')) {
                   seenClasses.add('No Tailwind Shadow');
                   out += 'Tailwind: No Tailwind Shadow | Line ' + (i+1) + ': ' + trimmed.substring(0, 150) + '\n';
                }
             }
          }
          if (styleMatch) {
             const style = styleMatch[1];
             if (style.includes('boxShadow')) {
                const bs = style.match(/boxShadow:\s*'([^']+)'/);
                if (bs) {
                   approach = bs[1];
                   if (!seenStyles.has(approach)) {
                      seenStyles.add(approach);
                      out += 'Inline: ' + approach + ' | Line ' + (i+1) + ': ' + trimmed.substring(0, 150) + '\n';
                   }
                }
             } else if (style.includes('backgroundColor') && style.includes('var(--card)')) {
                if (!seenStyles.has('No Inline Shadow')) {
                   seenStyles.add('No Inline Shadow');
                   out += 'Inline: No Inline Shadow | Line ' + (i+1) + ': ' + trimmed.substring(0, 150) + '\n';
                }
             }
          }
       }
    }
  });
});
fs.writeFileSync('shadow_examples.txt', out);
