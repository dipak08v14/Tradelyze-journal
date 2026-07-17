const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const changes = [];

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let changed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('className=') && line.includes('min-h-screen')) {
      let originalLine = line;
      let modifiedLine = line;
      let matched = false;
      
      replacements.forEach(r => {
        if (modifiedLine.includes(r.searchStr)) {
          modifiedLine = modifiedLine.replace(r.searchStr, r.replaceStr);
          matched = true;
        }
      });
      
      if (matched && originalLine !== modifiedLine) {
        lines[i] = modifiedLine;
        changes.push({
          file: path.basename(filePath),
          line: i + 1,
          before: originalLine.trim(),
          after: modifiedLine.trim()
        });
        changed = true;
      }
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, lines.join('\n'));
  }
}

const filesWithStart = [
  'AdvancedReports.tsx',
  'DashboardPage.tsx',
  'Notebook.tsx',
  'TradingLogsPage.tsx'
];

const filesWithoutStart = [
  'AiTeacherPage.tsx',
  'AnnualReportsPage.tsx',
  'DailyJournal.tsx',
  'PlaceholderPage.tsx',
  'StrategiesPage.tsx',
  'StrategyBuilderPage.tsx',
  'StrategyDetail.tsx',
  'TradeEntryPage.tsx',
  'TradeTrackingPage.tsx',
  'TradingReportsPage.tsx'
];

filesWithStart.forEach(file => {
  const p = path.join(pagesDir, file);
  replaceInFile(p, [
    { searchStr: 'md:flex-row', replaceStr: 'lg:flex-row' },
    { searchStr: 'md:items-start', replaceStr: 'lg:items-start' }
  ]);
});

filesWithoutStart.forEach(file => {
  const p = path.join(pagesDir, file);
  replaceInFile(p, [
    { searchStr: 'md:flex-row', replaceStr: 'lg:flex-row' }
  ]);
});

fs.writeFileSync('outermost-changes.json', JSON.stringify(changes, null, 2));
