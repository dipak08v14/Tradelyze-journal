const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Search for Running P&L chart data fetching in TradeTrackingPage.tsx:");
lines.forEach((l, i) => {
  if (l.includes('chartData') || l.includes('TwelveData') || l.includes('chartLoading') || l.includes('apiError') || l.includes('setChartData')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
