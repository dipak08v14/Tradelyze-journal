const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for return statements in DashboardPage.tsx:");
lines.forEach((l, i) => {
  if (l.trim().startsWith('return (') && (l.startsWith('  return (') || l.startsWith('    return ('))) {
    console.log(`${i+1}: ${l}`);
  }
});
