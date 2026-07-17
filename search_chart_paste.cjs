const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'components', 'TradeChart.jsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for 'paste', 'file', or 'upload' in TradeChart.jsx:");
lines.forEach((l, i) => {
  if (l.toLowerCase().includes('paste') || l.toLowerCase().includes('upload') || l.toLowerCase().includes('file')) {
    if (l.length < 150) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
