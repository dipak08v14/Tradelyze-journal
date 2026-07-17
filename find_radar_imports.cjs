const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for RadarScoreChart imports/calls in TradeTrackingPage.tsx:");
lines.forEach((l, i) => {
  if (l.includes('RadarScoreChart') || l.includes('RadarChart')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
