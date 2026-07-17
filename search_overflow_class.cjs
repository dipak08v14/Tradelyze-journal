const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'StrategiesPage.tsx'), 'utf8');

const lines = content.split('\n');
console.log("Searching for 'rounded-xl mt-6 overflow-hidden' in StrategiesPage.tsx:");
lines.forEach((l, i) => {
  if (l.includes('rounded-xl') && l.includes('overflow-hidden') || l.includes('mt-6')) {
    if (l.length < 150) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
