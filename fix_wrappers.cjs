const fs = require('fs');

function applyFixes(file, fixes) {
  let content = fs.readFileSync(file, 'utf8');
  fixes.forEach(fix => {
    let replaced = 0;
    content = content.replace(fix.regex, (...args) => {
      replaced++;
      return fix.replacement(...args);
    });
    console.log(file + ' applied ' + replaced + ' instances of ' + fix.name);
  });
  fs.writeFileSync(file, content, 'utf8');
}

// 1. AnnualReportsPage.tsx
applyFixes('src/pages/AnnualReportsPage.tsx', [
  {
    name: 'Section Wrappers (9x)',
    regex: /<section style=\{\{ backgroundColor: 'var\(--card\)', border: '1px solid rgba\(0,0,0,0\.06\)', borderRadius: '16px'/g,
    replacement: () => `<section style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px'`
  },
  {
    name: 'Year Selection Empty State (2x)',
    regex: /className="p-6 rounded-2xl([^"]*)" style=\{\{ backgroundColor: 'var\(--card\)', boxShadow: '0 10px 25px rgba\(0, 0, 0, 0\.05\)', border: '1px solid rgba\(0, 0, 0, 0\.06\)'/g,
    replacement: (match, p1) => `className="p-6 rounded-xl${p1}" style={{ backgroundColor: 'var(--card)', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', border: '1px solid var(--border)'`
  }
]);

// 2. TradingLogsPage.tsx
applyFixes('src/pages/TradingLogsPage.tsx', [
  {
    name: 'Main Data Table Wrapper (2x)',
    regex: /border: '1px solid rgba\(0,0,0,0\.06\)'(, border(Bottom|Top))/g,
    replacement: (match, p1) => `border: '1px solid var(--border)'${p1}`
  },
  {
    name: 'Empty/Loading States (2x)',
    regex: /className="rounded-2xl ([^"]*)" style=\{\{ backgroundColor: 'var\(--card\)', border: '0\.5px solid var\(--border\)'/g,
    replacement: (match, p1) => `className="rounded-xl ${p1}" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)'`
  }
]);

// 3. DailyJournal.tsx
applyFixes('src/pages/DailyJournal.tsx', [
  {
    name: 'Empty States (2x)',
    regex: /border: '1px solid rgba\(0,0,0,0\.06\)', borderRadius: '12px'/g,
    replacement: () => `border: '1px solid var(--border)', borderRadius: '12px'`
  }
]);
