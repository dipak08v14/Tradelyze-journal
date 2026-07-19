const fs = require('fs');
const path = require('path');

function searchFiles(dir, queries) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      searchFiles(fullPath, queries);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      queries.forEach(q => {
        lines.forEach((l, i) => {
          if (l.toLowerCase().includes(q.toLowerCase())) {
            console.log(`\nFound "${q}" in ${fullPath} at line ${i + 1}:`);
            // Print context (5 lines before, 10 lines after)
            const start = Math.max(0, i - 5);
            const end = Math.min(lines.length, i + 10);
            for (let j = start; j < end; j++) {
              console.log(`${j + 1}: ${lines[j]}`);
            }
          }
        });
      });
    }
  });
}

console.log('--- SEARCHING FOR LINKS ---');
searchFiles('src/pages', ['< Trading Logs', '< Strategies', 'Back to strategies']);
