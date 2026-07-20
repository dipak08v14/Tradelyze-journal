const fs = require('fs');

function applyFix(filePath, match, replacement) {
  let content = fs.readFileSync(filePath, 'utf8');
  let isMatch = match instanceof RegExp ? match.test(content) : content.includes(match);
  if (isMatch) {
    content = content.replace(match, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Fixed ' + filePath.split('/').pop());
  } else {
    console.log('Match not found in ' + filePath.split('/').pop() + ' for: ' + match);
  }
}

// 3. AdvancedReports.tsx
applyFix(
  'C:/Users/dipak/OneDrive/Documents/GitHub/Tradelyze-journal/src/pages/AdvancedReports.tsx',
  /<div className="mt-3" \/>\r?\n\r?\n\s*{\/\* TAB SELECTOR BAR \*\/}/,
  '{/* TAB SELECTOR BAR */}'
);
applyFix(
  'C:/Users/dipak/OneDrive/Documents/GitHub/Tradelyze-journal/src/pages/AdvancedReports.tsx',
  'className="flex overflow-x-auto gap-2 px-1 pt-1 pb-1 rounded-lg mb-3 font-mono no-scrollbar"',
  'className="flex overflow-x-auto gap-2 px-1 pt-1 pb-1 rounded-lg mt-3 mb-3 font-mono no-scrollbar"'
);

// 4. StrategyDetail.tsx
applyFix(
  'C:/Users/dipak/OneDrive/Documents/GitHub/Tradelyze-journal/src/pages/StrategyDetail.tsx',
  'className="flex items-center gap-2.5 mb-3"',
  'className="flex items-center gap-2.5"'
);
applyFix(
  'C:/Users/dipak/OneDrive/Documents/GitHub/Tradelyze-journal/src/pages/StrategyDetail.tsx',
  'className="flex items-center overflow-x-auto gap-1 sticky top-0 z-10 scrollbar-none mb-3 px-1 py-1 rounded-lg"',
  'className="flex items-center overflow-x-auto gap-1 sticky top-0 z-10 scrollbar-none mt-3 mb-3 px-1 py-1 rounded-lg"'
);
