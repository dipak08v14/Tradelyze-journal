const fs = require('fs');
let content = fs.readFileSync('src/pages/AnnualReportsPage.tsx', 'utf8');

// Section wrappers
let regex1 = /<section style=\{\{ backgroundColor: 'var\(--card\)', border: '1px solid rgba\(0,0,0,0\.06\)', borderRadius: '16px'/g;
let replaced1 = 0;
content = content.replace(regex1, (...args) => {
  replaced1++;
  return `<section style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px'`;
});
console.log('Replaced ' + replaced1 + ' section wrappers');

// Year selection / Empty states
let regex2 = /className="p-6 rounded-2xl([^"]*)" style=\{\{ backgroundColor: 'var\(--card\)', boxShadow: '0 10px 25px rgba\(0, 0, 0, 0\.05\)', border: '1px solid rgba\(0, 0, 0, 0\.06\)'/g;
let replaced2 = 0;
content = content.replace(regex2, (match, p1) => {
  replaced2++;
  return `className="p-6 rounded-xl${p1}" style={{ backgroundColor: 'var(--card)', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', border: '1px solid var(--border)'`;
});
console.log('Replaced ' + replaced2 + ' year selection states');

fs.writeFileSync('src/pages/AnnualReportsPage.tsx', content, 'utf8');
