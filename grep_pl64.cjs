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
      if (content.includes('pl-64')) {
        console.log(`Found 'pl-64' in: ${full}`);
      }
      if (content.includes('flex-grow')) {
        // console.log(`Found 'flex-grow' in: ${full}`);
      }
    }
  });
}

search(path.join(__dirname, 'src'));
