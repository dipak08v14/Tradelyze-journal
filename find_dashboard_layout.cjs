const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for render block starting at export const DashboardPage:");
let foundComponent = false;
let count = 0;
lines.forEach((l, i) => {
  if (l.includes('export const DashboardPage =') || l.includes('export const DashboardPage:')) {
    foundComponent = true;
  }
  if (foundComponent && count < 60) {
    console.log(`${i+1}: ${l}`);
    count++;
  }
});
