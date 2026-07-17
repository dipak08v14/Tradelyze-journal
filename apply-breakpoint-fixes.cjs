const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const pagesDir = path.join(srcDir, 'pages');
const componentsDir = path.join(srcDir, 'components');

const changes = [];

function replaceInFile(filePath, searchStr, replaceStr, description) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let changed = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchStr)) {
      const originalLine = lines[i];
      lines[i] = lines[i].replace(searchStr, replaceStr);
      changes.push({
        file: path.relative(__dirname, filePath),
        line: i + 1,
        before: originalLine.trim(),
        after: lines[i].trim()
      });
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, lines.join('\n'));
  }
}

// PART A - Sidebar.tsx
const sidebarPath = path.join(componentsDir, 'Sidebar.tsx');
replaceInFile(sidebarPath, 'className="md:hidden p-1 bg-transparent rounded-lg cursor-pointer absolute"', 'className="lg:hidden p-1 bg-transparent rounded-lg cursor-pointer absolute"');
replaceInFile(sidebarPath, 'className="hidden md:flex flex-col w-[220px] h-screen sticky top-0 overflow-y-hidden flex-shrink-0"', 'className="hidden lg:flex flex-col w-[220px] h-screen sticky top-0 overflow-y-hidden flex-shrink-0"');
replaceInFile(sidebarPath, 'className="fixed inset-0 z-40 md:hidden transition-opacity backdrop-blur-sm"', 'className="fixed inset-0 z-40 lg:hidden transition-opacity backdrop-blur-sm"');
replaceInFile(sidebarPath, 'z-50 md:hidden shadow-2xl transition-transform duration-250 ease-in-out', 'z-50 lg:hidden shadow-2xl transition-transform duration-250 ease-in-out');

// PART B - Group A Pages
const groupA = [
  'DashboardPage.tsx',
  'DailyJournal.tsx',
  'TradingLogsPage.tsx',
  'TradeTrackingPage.tsx',
  'StrategiesPage.tsx',
  'StrategyDetail.tsx',
  'StrategyBuilderPage.tsx',
  'TradingReportsPage.tsx',
  'AdvancedReports.tsx',
  'AnnualReportsPage.tsx',
  'TradeEntryPage.tsx'
];

groupA.forEach(page => {
  const pagePath = path.join(pagesDir, page);
  replaceInFile(pagePath, 'className="flex items-center justify-between px-6 py-4 md:hidden sticky top-0 z-20"', 'className="flex items-center justify-between px-6 py-4 lg:hidden sticky top-0 z-20"');
  replaceInFile(pagePath, 'className="flex items-center justify-between px-6 py-4 md:hidden sticky top-0 z-25"', 'className="flex items-center justify-between px-6 py-4 lg:hidden sticky top-0 z-25"');
});

// PART C - Group B Pages
const groupB = [
  'RiskCalculatorPage.tsx',
  'SettingsPage.tsx'
];

groupB.forEach(page => {
  const pagePath = path.join(pagesDir, page);
  replaceInFile(pagePath, 'className="md:hidden p-2 rounded-lg"', 'className="lg:hidden p-2 rounded-lg"');
});

fs.writeFileSync('breakpoint-changes.json', JSON.stringify(changes, null, 2));
