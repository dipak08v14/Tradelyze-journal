const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for headings in first half of render (lines 1670 to 2174):");
for (let i = 1669; i < 2174; i++) {
  const line = lines[i];
  if (line.includes('section') || line.includes('h2') || line.includes('h3') || line.includes('CARD ') || line.includes('h4')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
}
