const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, 'src', 'pages');
const files = ['DashboardPage.tsx', 'TradeEntryPage.tsx', 'StrategiesPage.tsx'];

for (const file of files) {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
  const lines = content.split('\n');
  let count = 0;
  for (const line of lines) {
    if (line.match(/<(?:button|Button).*?className=/i) && count < 5) {
      console.log(`${file}: ${line.trim()}`);
      count++;
    }
  }
}
