const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'StrategyBuilderPage.tsx'), 'utf8');

const lines = content.split('\n');
console.log("Searching for header structure in StrategyBuilderPage.tsx:");
lines.forEach((l, i) => {
  if (l.includes('<h1') || l.includes('calc(100%') || l.includes('marginLeft') || l.includes('header') || l.includes('return (')) {
    if (l.length < 150) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
