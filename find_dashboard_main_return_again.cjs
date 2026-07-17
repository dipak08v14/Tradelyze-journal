const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for return ( starting from line 1300:");
let foundReturn = false;
let count = 0;
lines.forEach((l, i) => {
  if (i >= 1200 && i <= 1450) {
    if (l.includes('return (')) {
      console.log(`Found return at line ${i+1}: ${l.trim()}`);
      for (let j = 0; j < 30; j++) {
        console.log(`${i+1+j}: ${lines[i+j]}`);
      }
      count++;
    }
  }
});
