const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'StrategyDetail.tsx'), 'utf8');

const lines = content.split('\n');
console.log("Searching for '<table' in StrategyDetail.tsx:");
lines.forEach((l, i) => {
  if (l.includes('<table') || l.includes('overflow-x') || l.includes('min-w-')) {
    if (l.length < 150) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
