const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'TradeTrackingPage.tsx'), 'utf-8');

const lines = content.split('\n');
console.log("Searching for tab content rendering in TradeTrackingPage:");
lines.forEach((l, i) => {
  if (l.includes('activeTab ===') || l.includes('bottomTab ===') || l.includes('activeTab === \'playbooks\'') || l.includes('activeTab === \'market\'') || l.includes('=== \'Stats\'') || l.includes('=== \'Playbooks\'') || l.includes('=== \'Market\'')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
