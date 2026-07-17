const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for 'Attachments' or 'paste' in TradeTrackingPage.tsx:");
lines.forEach((l, i) => {
  if (l.toLowerCase().includes('attachment') || l.toLowerCase().includes('paste') || l.toLowerCase().includes('dropzone') || l.toLowerCase().includes('upload')) {
    if (l.length < 150) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
