const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Playbooks Tab detailed lines:");
for (let i = 2173; i < 2273; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
