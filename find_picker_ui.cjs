const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx'), 'utf-8');

const lines = content.split('\n');
let count = 0;
lines.forEach((l, i) => {
  if ((l.includes('DatePicker') || l.includes('DateRange') || l.includes('picker') || l.includes('tempStart') || l.includes('calMonth') || l.includes('startDate')) && count < 30) {
    if (l.includes('<div') || l.includes('<button') || l.includes('onClick')) {
      console.log(`${i+1}: ${l.trim()}`);
      count++;
    }
  }
});
