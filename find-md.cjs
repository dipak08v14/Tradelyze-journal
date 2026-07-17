const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx');
const content = fs.readFileSync(dashboardPath, 'utf8');
const lines = content.split('\n');

const regex = /className=(?:\{`|["'])([^"'\}`]*md:(flex-row|grid-cols|items-start|items-center|justify-between|w-|pl-|pr-|px-|gap-)[^"'\}`]*)/g;

const results = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(regex);
  if (match) {
    results.push({ line: i + 1, code: line.trim() });
  }
}

fs.writeFileSync('dashboard-md-classes.json', JSON.stringify(results, null, 2));
