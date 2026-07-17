const fs = require('fs');
const path = require('path');

function searchFile(dir, fileName) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        const res = searchFile(fullPath, fileName);
        if (res) return res;
      }
    } else if (file === fileName) {
      return fullPath;
    }
  }
  return null;
}

const projRoot = path.join(__dirname);
const tradeChartPath = searchFile(projRoot, 'TradeChart.tsx') || searchFile(projRoot, 'TradeChart.jsx');
console.log(`TradeChart file path: ${tradeChartPath}`);

if (tradeChartPath) {
  const content = fs.readFileSync(tradeChartPath, 'utf8');
  console.log("Checking for width in TradeChart:");
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('width') || l.includes('minWidth') || l.includes('778px') || l.includes('778')) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  });
}
