const fs = require('fs');
const files = ['DashboardPage.tsx', 'TradingLogsPage.tsx', 'DailyJournal.tsx', 'TradeEntryPage.tsx', 'SettingsPage.tsx', 'AiTeacherPage.tsx', 'StrategiesPage.tsx', 'RiskCalculatorPage.tsx'];

let out = '';
files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  out += '=== ' + file + ' ===\n';
  
  // Extract all className strings
  const classNameRegex = /className=(?:\{`|"|')([^`"']+)(?:`\}|"|')/g;
  let classMatch;
  const classShadows = new Set();
  while ((classMatch = classNameRegex.exec(content)) !== null) {
    const classes = classMatch[1].split(/\s+/);
    const shadows = classes.filter(c => c.startsWith('shadow'));
    // Also track if it's a flat card (bg-card + border + rounded but NO shadow)
    if (shadows.length > 0) {
      classShadows.add(shadows.join(' '));
    } else if (classes.some(c => c.includes('bg-[var(--card)]') || c.includes('bg-white') || c === 'bg-card') && classes.some(c => c.includes('rounded')) && classes.some(c => c.includes('border'))) {
      classShadows.add('NO_SHADOW_CLASS (flat card)');
    }
  }
  
  // Extract all inline styles
  const styleRegex = /style=\{\{(.*?)\}\}/g;
  let styleMatch;
  const styleShadows = new Set();
  while ((styleMatch = styleRegex.exec(content)) !== null) {
    const style = styleMatch[1];
    if (style.includes('boxShadow')) {
      const bs = style.match(/boxShadow:\s*'([^']+)'/);
      if (bs) styleShadows.add('Inline: ' + bs[1]);
    } else if (style.includes('backgroundColor') && style.includes('var(--card)')) {
      // Check if this style has border but no shadow
      styleShadows.add('NO_SHADOW_INLINE (flat card)');
    }
  }
  
  out += 'Tailwind Shadows:\n';
  classShadows.forEach(s => out += '  - ' + s + '\n');
  out += 'Inline Shadows:\n';
  styleShadows.forEach(s => out += '  - ' + s + '\n');
});
fs.writeFileSync('shadow_audit2.txt', out);
