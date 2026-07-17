const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for export default and component declarations in DashboardPage.tsx:");
lines.forEach((l, i) => {
  if (l.includes('export default') || l.includes('function ') || l.includes('const DashboardPage')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
