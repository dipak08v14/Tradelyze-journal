const fs = require('fs');
const path = require('path');

const files = ['TradingLogsPage.tsx', 'TradeTrackingPage.tsx', 'StrategiesPage.tsx', 'StrategyDetail.tsx'];
files.forEach(f => {
  const full = path.join(__dirname, 'src', 'pages', f);
  if (fs.existsSync(full)) {
    const content = fs.readFileSync(full, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('min-w-') || l.includes('minWidth')) {
        console.log(`${f}:${i+1} -> ${l.trim()}`);
      }
    });
  }
});
