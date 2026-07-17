const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'components', 'TradeChart.jsx'), 'utf-8');

const lines = content.split('\n');
console.log("Search for renderTimeframeButtons calls in TradeChart.jsx:");
lines.forEach((l, i) => {
  if (l.includes('renderTimeframeButtons')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
