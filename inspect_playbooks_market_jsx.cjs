const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Playbooks Tab rendering:");
let inPlaybooks = false;
let playbooksLines = [];
lines.forEach((l, i) => {
  if (l.includes('{activeTab === \'playbooks\' && (')) {
    inPlaybooks = true;
  }
  if (inPlaybooks) {
    playbooksLines.push(`${i+1}: ${l}`);
    if (l.includes('</motion.div>') || l.includes(')}')) {
      // Check if we hit the end of activeTab === 'playbooks'
      if (playbooksLines.length > 50 && l.trim() === ')}') {
        inPlaybooks = false;
      }
    }
  }
});
console.log(playbooksLines.slice(0, 100).join('\n'));

console.log("\nMarket Tab rendering:");
let inMarket = false;
let marketLines = [];
lines.forEach((l, i) => {
  if (l.includes('{activeTab === \'market\' && (')) {
    inMarket = true;
  }
  if (inMarket) {
    marketLines.push(`${i+1}: ${l}`);
    if (l.includes('</motion.div>') || l.includes(')}')) {
      if (marketLines.length > 50 && l.trim() === ')}') {
        inMarket = false;
      }
    }
  }
});
console.log(marketLines.slice(0, 100).join('\n'));
