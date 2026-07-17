const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for render start and wrapper divs in DashboardPage.tsx:");
let foundReturn = false;
let count = 0;
lines.forEach((l, i) => {
  if (l.includes('return (') && i > 1500) {
    foundReturn = true;
  }
  if (foundReturn && count < 40) {
    console.log(`${i+1}: ${l.trim()}`);
    count++;
  }
});
