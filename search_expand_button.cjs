const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'components', 'TradeChart.jsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for 'Expand' or maximized trigger in TradeChart.jsx:");
lines.forEach((l, i) => {
  if (l.includes('isMaximized') || l.includes('setIsMaximized') || l.includes('Expand')) {
    if (l.length < 150) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
