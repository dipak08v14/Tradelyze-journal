const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for page wrapper and header strip in TradeTrackingPage.tsx:");
lines.forEach((l, i) => {
  if (l.includes('px-4') || l.includes('px-6') || l.includes('-mx-6') || l.includes('header') || l.includes('MainLayout') || l.includes('className="p-')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
