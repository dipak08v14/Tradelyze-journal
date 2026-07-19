const fs = require('fs');
const files = ['DashboardPage.tsx', 'TradingLogsPage.tsx', 'DailyJournal.tsx', 'TradeEntryPage.tsx', 'SettingsPage.tsx', 'AiTeacherPage.tsx', 'StrategiesPage.tsx', 'RiskCalculatorPage.tsx'];

let out = '';
files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  out += '=== ' + file + ' ===\n';
  const seen = new Set();
  
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // find elements that look like cards/wrappers
    if (trimmed.includes('<div') || trimmed.includes('<section') || trimmed.includes('<article') || trimmed.includes('<aside') || trimmed.includes('<main')) {
       if (trimmed.includes('rounded') || trimmed.includes('shadow')) {
          const match = trimmed.match(/className=(?:\{`|")([^`"]+)(?:`\}|")/);
          const styleMatch = trimmed.match(/style=\{\{(.*?)\}\}/);
          let summary = '';
          
          if (match) {
             const cls = match[1];
             const shadows = cls.split(/\s+/).filter(c => c.startsWith('shadow'));
             if (shadows.length) {
                summary += 'Tailwind Shadows: ' + shadows.join(', ') + ' ';
             } else if (cls.includes('bg-white') || cls.includes('bg-[var(--card)]') || cls.includes('bg-slate')) {
                summary += 'No Tailwind Shadow (Flat) ';
             }
          }
          if (styleMatch) {
             const style = styleMatch[1];
             if (style.includes('boxShadow')) {
                const bs = style.match(/boxShadow:\s*'([^']+)'/);
                if (bs) summary += 'Inline boxShadow: ' + bs[1] + ' ';
             }
          }
          
          if (summary && !seen.has(summary)) {
             seen.add(summary);
             out += '[' + (i+1) + '] ' + summary.trim() + '\n';
             out += '    ' + trimmed.substring(0, 150) + '\n';
          }
       }
    }
  });
});
fs.writeFileSync('shadow_audit.txt', out);
