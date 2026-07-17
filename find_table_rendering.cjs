const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradingLogsPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Search for table and thead elements in TradingLogsPage:");
lines.forEach((l, i) => {
  if (l.includes('<table') || l.includes('<thead') || l.includes('const columns') || l.includes('colDefs') || l.includes('columnDefs')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
