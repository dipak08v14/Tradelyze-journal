const fs = require('fs');
const path = require('path');

const files = [
  'AdvancedReports.tsx',
  'AnnualReportsPage.tsx',
  'DailyJournal.tsx',
  'DashboardPage.tsx',
  'SettingsPage.tsx',
  'StrategiesPage.tsx',
  'StrategyDetail.tsx',
  'TradingLogsPage.tsx',
  'TradingReportsPage.tsx'
];

for (const file of files) {
  const filePath = path.join(__dirname, 'src', 'pages', file);
  if (!fs.existsSync(filePath)) continue;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log(`\n--- ${file} ---`);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<table') || lines[i].includes('<Table')) {
      console.log(`L${i+1}:`);
      console.log(`  ${lines[i-2] || ''}`);
      console.log(`  ${lines[i-1] || ''}`);
      console.log(`  ${lines[i]}`);
    }
  }
}
