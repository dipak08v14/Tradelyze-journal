const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'StrategiesPage.tsx'), 'utf8');

const lines = content.split('\n');
console.log("Searching for 'rounded-xl' or 'overflow-hidden' or 'mt-6' in StrategiesPage.tsx:");
lines.forEach((l, i) => {
  const lower = l.toLowerCase();
  if (lower.includes('rounded-xl') || lower.includes('overflow-hidden') || lower.includes('mt-6') || lower.includes('card')) {
    if (l.length < 150) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
