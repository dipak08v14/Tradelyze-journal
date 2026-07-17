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
    } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('document.body') || content.includes('body.style')) {
        console.log(`Found 'document.body' in: ${full}`);
        const lines = content.split('\n');
        lines.forEach((l, i) => {
          if (l.includes('body')) {
            console.log(`  Line ${i+1}: ${l.trim()}`);
          }
        });
      }
    }
  });
}

search(__dirname);
