const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'StrategyDetail.tsx'), 'utf8');

const lines = content.split('\n');
console.log("Imports in StrategyDetail.tsx:");
lines.forEach((l, i) => {
  if (l.trim().startsWith('import')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
