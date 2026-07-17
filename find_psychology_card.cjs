const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Search for Psychology elements in TradeTrackingPage:");
lines.forEach((l, i) => {
  if (l.toLowerCase().includes('psychology') || l.toLowerCase().includes('breakdown')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
