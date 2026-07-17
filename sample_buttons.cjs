const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, 'src', 'pages');
const content = fs.readFileSync(path.join(pagesDir, 'TradeEntryPage.tsx'), 'utf-8') + fs.readFileSync(path.join(pagesDir, 'DashboardPage.tsx'), 'utf-8');
const regex = /<(?:button|Button|input|select|div).*?className=["']([^"']*(?:px-\d|py-\d|p-\d|h-\d|w-\d)[^"']*)["']/g;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null && count < 10) {
  if (match[0].includes('button') || match[0].includes('Button')) {
    console.log(match[1]);
    count++;
  }
}
