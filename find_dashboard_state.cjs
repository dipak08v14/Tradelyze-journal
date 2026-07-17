const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx'), 'utf-8');

const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('useState') && (l.includes('date') || l.includes('Date') || l.includes('range') || l.includes('Range'))) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
