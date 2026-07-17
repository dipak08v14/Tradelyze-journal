const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradingLogsPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Search for ALL_COLUMNS_INFO and selectedColumns in TradingLogsPage:");
lines.forEach((l, i) => {
  if (l.includes('ALL_COLUMNS_INFO') || l.includes('selectedColumns') || l.includes('colDefinitions')) {
    if (i < 500) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
