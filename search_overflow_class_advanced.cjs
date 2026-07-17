const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'StrategiesPage.tsx'), 'utf8');

const lines = content.split('\n');
console.log("Searching for classes in StrategiesPage.tsx:");
lines.forEach((l, i) => {
  if (l.includes('rounded-xl') && l.includes('overflow-hidden')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
