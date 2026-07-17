const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for main return in DashboardPage.tsx:");
let foundComponent = false;
let count = 0;
lines.forEach((l, i) => {
  if (l.includes('export default function DashboardPage') || l.includes('function DashboardPageContent')) {
    foundComponent = true;
  }
  if (foundComponent) {
    if (l.includes('return (') && count === 0) {
      console.log(`Found main return at line ${i+1}: ${l.trim()}`);
      for (let j = 0; j < 30; j++) {
        console.log(`${i+1+j}: ${lines[i+j]}`);
      }
      count++;
    }
  }
});
