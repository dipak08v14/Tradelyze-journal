const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'components', 'TradeChart.jsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for 'resize' or 'ResizeObserver' in TradeChart.jsx:");
lines.forEach((l, i) => {
  if (l.includes('resize') || l.includes('ResizeObserver') || l.includes('Observer')) {
    if (l.length < 150) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
