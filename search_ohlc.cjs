const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'components', 'TradeChart.jsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for 'OHLC' or Open/High/Low/Close indicators in TradeChart.jsx:");
lines.forEach((l, i) => {
  if (l.includes('OHLC') || l.includes('open') || l.includes('high') || l.includes('low') || l.includes('close') || l.includes('O:') || l.includes('H:') || l.includes('L:') || l.includes('C:')) {
    if (l.length < 150) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
