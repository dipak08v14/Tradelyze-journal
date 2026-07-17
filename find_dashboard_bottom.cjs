const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx'), 'utf-8');

const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('Open Positions') || l.includes('Monthly Calendar')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
