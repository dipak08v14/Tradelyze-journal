const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const pagesDir = path.join(srcDir, 'pages');
const sidebarPath = path.join(srcDir, 'components', 'Sidebar.tsx');

const results = {
  sidebar: [],
  pages: {}
};

// 1. Check Sidebar.tsx for 'md:'
if (fs.existsSync(sidebarPath)) {
  const content = fs.readFileSync(sidebarPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('md:')) {
      results.sidebar.push({ line: i + 1, code: line.trim() });
    }
  });
}

// 2. Check all pages for the mobile header bar
// We are looking for something like: md:hidden
// The mobile header usually contains the Menu icon or TRADELYZE text.
const pages = [
  'DashboardPage.tsx',
  'DailyJournal.tsx',
  'TradingLogsPage.tsx',
  'TradeTrackingPage.tsx',
  'StrategiesPage.tsx',
  'StrategyDetail.tsx',
  'StrategyBuilderPage.tsx',
  'RiskCalculatorPage.tsx',
  'SettingsPage.tsx',
  'TradingReportsPage.tsx',
  'AdvancedReports.tsx',
  'AnnualReportsPage.tsx',
  'TradeEntryPage.tsx'
];

for (const page of pages) {
  const p = path.join(pagesDir, page);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split('\n');
    const pageMdClasses = [];
    
    // Attempt to find the mobile header
    // It's usually a div with 'md:hidden' at the top of the file
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('md:hidden') || (line.includes('flex') && line.includes('items-center') && line.includes('justify-between') && line.includes('border-b'))) {
            // Also let's just collect all md:hidden occurrences for review
            if (line.includes('md:hidden')) {
               pageMdClasses.push({ line: i + 1, code: line.trim() });
            }
        }
    }
    results.pages[page] = pageMdClasses;
  }
}

fs.writeFileSync('breakpoint-investigation.json', JSON.stringify(results, null, 2));
