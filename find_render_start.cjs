const fs = require('fs');
const path = require('path');

function inspect(file) {
  const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', file), 'utf8');
  const lines = content.split('\n');
  console.log(`=== ${file} ===`);
  lines.forEach((l, i) => {
    if (l.trim().startsWith('return (') && l.includes('div') || l.trim() === 'return (') {
      console.log(`Line ${i+1}: ${l}`);
    }
  });
}

inspect('StrategiesPage.tsx');
inspect('StrategyDetail.tsx');
