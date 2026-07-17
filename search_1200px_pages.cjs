const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir);
files.forEach(f => {
  if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx')) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    if (content.includes('1200')) {
      console.log(`Found '1200' in page: ${f}`);
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        if (l.includes('1200')) {
          console.log(`  Line ${i+1}: ${l.trim()}`);
        }
      });
    }
  }
});
