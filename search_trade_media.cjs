const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for file inputs or uploads in TradeTrackingPage.tsx:");
lines.forEach((l, i) => {
  if (l.includes('type="file"') || l.includes("type='file'") || l.includes('upload') || l.includes('Upload')) {
    if (l.length < 150) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
