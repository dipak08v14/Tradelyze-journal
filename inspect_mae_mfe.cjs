const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for MAE/MFE elements in TradeTrackingPage.tsx:");
lines.forEach((l, i) => {
  if (l.includes('MAE') || l.includes('MFE') || l.includes('Worst price') || l.includes('Best price')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
