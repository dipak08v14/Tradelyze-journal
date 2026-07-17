const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradingLogsPage.tsx'), 'utf-8');

console.log("Check links / navigate in TradingLogsPage:");
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('navigate(') || l.includes('<Link') || l.includes('onClick') || l.includes('history.push')) {
    if (i > 1500 && i < 2000) { // Look around table rendering
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
