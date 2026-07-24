const fs = require('fs');
['src/pages/TradeEntryPage.tsx', 'src/pages/TradeTrackingPage.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let replaced = 0;
  
  // Section wrappers (change border color and ensure radius is 12px)
  // They might be `border: '1px solid rgba(0,0,0,0.06)'`
  content = content.replace(/border: '1px solid rgba\(0,0,0,0\.06\)'/g, () => {
    replaced++;
    return `border: '1px solid var(--border)'`;
  });
  
  // Ensure border radius is 12px where it was 16px, although we found it might not have been 16px.
  // We'll replace `borderRadius: '16px'` with `borderRadius: '12px'` globally in these wrappers if any exist.
  content = content.replace(/borderRadius: '16px'/g, () => {
    replaced++;
    return `borderRadius: '12px'`;
  });

  // Year Selection Empty States in TradeTrackingPage
  content = content.replace(/className="p-6 rounded-2xl([^"]*)" style=\{\{ backgroundColor: 'var\(--card\)', boxShadow: '0 10px 25px rgba\(0, 0, 0, 0\.05\)', border: '1px solid rgba\(0, 0, 0, 0\.06\)'/g, (match, p1) => {
    replaced++;
    return `className="p-6 rounded-xl${p1}" style={{ backgroundColor: 'var(--card)', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', border: '1px solid var(--border)'`;
  });

  if (replaced > 0) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(file + ' applied ' + replaced + ' replacements');
  }
});
