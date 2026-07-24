const fs = require('fs');

function applyFixes(file, fixes) {
  let content = fs.readFileSync(file, 'utf8');
  let fileChanged = false;
  fixes.forEach(fix => {
    let replaced = 0;
    content = content.replace(fix.regex, (...args) => {
      replaced++;
      fileChanged = true;
      return fix.replacement(...args);
    });
    if (replaced > 0) {
      console.log(file + ' applied ' + replaced + ' instances of ' + fix.name);
    }
  });
  if (fileChanged) fs.writeFileSync(file, content, 'utf8');
}

const fixes = [
  {
    name: 'Section Wrappers',
    regex: /<section style=\{\{ backgroundColor: 'var\(--card\)', border: '1px solid rgba\(0,0,0,0\.06\)', borderRadius: '16px'/g,
    replacement: () => `<section style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px'`
  },
  {
    name: 'Year Selection Empty State',
    regex: /className="p-6 rounded-2xl([^"]*)" style=\{\{ backgroundColor: 'var\(--card\)', boxShadow: '0 10px 25px rgba\(0, 0, 0, 0\.05\)', border: '1px solid rgba\(0, 0, 0, 0\.06\)'/g,
    replacement: (match, p1) => `className="p-6 rounded-xl${p1}" style={{ backgroundColor: 'var(--card)', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', border: '1px solid var(--border)'`
  }
];

const files = fs.readdirSync('src/pages').filter(f => f.endsWith('.tsx'));
files.forEach(f => {
  applyFixes('src/pages/' + f, fixes);
});
