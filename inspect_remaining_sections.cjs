const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for section headings and components in render (lines 2530 to end):");
for (let i = 2529; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('section') || line.includes('h2') || line.includes('h3') || line.includes('<Trade') || line.includes('<Performance') || line.includes('CARD ')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
}
