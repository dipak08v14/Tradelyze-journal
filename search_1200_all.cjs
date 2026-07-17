const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      search(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('min-w-[1200px]')) {
        console.log(`Found 'min-w-[1200px]' in: ${full}`);
      }
      if (content.includes('min-w-[800px]')) {
        console.log(`Found 'min-w-[800px]' in: ${full}`);
      }
    }
  });
}

search(path.join(__dirname, 'src'));
