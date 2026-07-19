const fs = require('fs');
const files = ['DashboardPage.tsx', 'TradingLogsPage.tsx'];

files.forEach(f => {
  try {
    const content = fs.readFileSync('src/pages/' + f, 'utf8');
    const lines = content.split('\n');
    let startIdx = lines.findIndex(l => l.includes('<h1') || l.includes('fontSize: \'28px\'') || l.includes('font-display tracking-tight') || l.includes('font-display'));
    if (startIdx !== -1) {
      console.log('===== ' + f + ' =====');
      const extract = lines.slice(Math.max(0, startIdx - 15), startIdx + 80).join('\n');
      console.log(extract);
    }
  } catch(e){
    console.error(e);
  }
});
