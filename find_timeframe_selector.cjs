const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'components', 'TradeChart.jsx'), 'utf-8');

const lines = content.split('\n');
console.log("Search for timeframe selectors in TradeChart.jsx:");
lines.forEach((l, i) => {
  if (l.includes('1M') || l.includes('3M') || l.includes('15M') || l.includes('5M') || l.includes('timeframe') || l.includes('Timeframe')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
