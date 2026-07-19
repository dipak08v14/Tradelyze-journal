const fs = require('fs');

function applyFix(filePath, regex, name) {
  let c = fs.readFileSync(filePath, 'utf8');
  if (regex.test(c)) {
    c = c.replace(regex, '');
    fs.writeFileSync(filePath, c);
    console.log(`✅ Fixed ${name} successfully.`);
  } else {
    console.error(`❌ ERROR: Target block not found in ${name}.`);
    process.exit(1);
  }
}

// 1. TradeTrackingPage
const regex1 = /\{\/\*\s*BREADCRUMB ROW WITH TRADE NAVIGATION\s*\*\/\}[\s\S]*?<div className="mb-1 flex items-center justify-between">[\s\S]*?<Link[\s\S]*?to="\/trading-logs"[\s\S]*?Trading Logs[\s\S]*?<\/Link>\s*<\/div>\s*/;
applyFix('src/pages/TradeTrackingPage.tsx', regex1, 'TradeTrackingPage.tsx');

// 2. StrategyDetail
const regex2 = /\{\/\*\s*BREADCRUMB ROW\s*\*\/\}[\s\S]*?<Link[\s\S]*?to="\/strategies"[\s\S]*?Strategies[\s\S]*?<\/Link>\s*/;
applyFix('src/pages/StrategyDetail.tsx', regex2, 'StrategyDetail.tsx');

// 3. StrategyBuilderPage
const regex3 = /\{\/\*\s*BREADCRUMB HEADER\s*\*\/\}[\s\S]*?<Link[\s\S]*?to="\/strategies"[\s\S]*?Back to Strategies[\s\S]*?<\/Link>\s*/;
applyFix('src/pages/StrategyBuilderPage.tsx', regex3, 'StrategyBuilderPage.tsx');

console.log('All targeted breadcrumb fixes applied.');
