const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Search for buttons and headers in TradeTrackingPage (All lines):");
lines.forEach((l, i) => {
  if (l.includes('Edit Trade') || l.includes('Delete') || l.includes('Trade Tracking') || l.includes('Ask AI')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
