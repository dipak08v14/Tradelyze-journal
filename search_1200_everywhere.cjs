const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    if (f === 'node_modules' || f === '.git' || f === 'dist' || f === 'tmp') return;
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      search(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.css')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('1200px') || content.includes('800px')) {
        console.log(`Found match in: ${full}`);
      }
    }
  });
}

search(__dirname);
