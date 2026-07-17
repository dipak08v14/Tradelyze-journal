const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Search for header elements in TradeTrackingPage:");
lines.forEach((l, i) => {
  if (l.includes('Trade Tracking') || l.includes('Edit Trade') || l.includes('Delete') || l.includes('Ask AI')) {
    if (i < 400) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
