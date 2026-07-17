const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Layout wrapper detailed lines:");
for (let i = 1480; i < 1530; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
