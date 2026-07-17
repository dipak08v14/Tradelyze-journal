const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Market Tab width styles:");
for (let i = 2401; i < 2601; i++) {
  if (lines[i] && (lines[i].includes('width:') || lines[i].includes('minWidth:') || lines[i].includes('className=') || lines[i].includes('justify-between'))) {
    console.log(`${i+1}: ${lines[i].trim()}`);
  }
}
