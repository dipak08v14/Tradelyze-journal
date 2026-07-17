const fs = require('fs');
const path = require('path');
function scanDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(scanDir(fullPath));
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
}
const files = scanDir('c:/Users/dipak/OneDrive/Documents/GitHub/Tradelyze-journal/src');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find Chart components with width={...}
  const chartRegex = /<(Line|Bar|Radar|Pie|Area|Composed|Scatter)Chart[\s\S]*?width=\{\d+\}[\s\S]*?>/g;
  let match;
  while ((match = chartRegex.exec(content)) !== null) {
    console.log('--- CHART WIDTH ---');
    console.log('File:', file);
    const line = content.substring(0, match.index).split('\n').length;
    console.log('Line:', line);
    console.log(match[0].substring(0, 150) + '...');
  }
  
  // Find hardcoded large px widths (w-[XXXpx]) where XXX >= 300
  const tailwindRegex = /w-\[(\d{3,})px\]/g;
  while ((match = tailwindRegex.exec(content)) !== null) {
    const num = parseInt(match[1], 10);
    if (num >= 300) {
      console.log('--- TAILWIND WIDTH ---');
      console.log('File:', file);
      const line = content.substring(0, match.index).split('\n').length;
      console.log('Line:', line);
      console.log('Match:', match[0]);
    }
  }

  // Find width: 'XXXpx'
  const styleRegex = /width:\s*['"]?(\d{3,})px['"]?/g;
  while ((match = styleRegex.exec(content)) !== null) {
    const num = parseInt(match[1], 10);
    if (num >= 300) {
      console.log('--- STYLE WIDTH ---');
      console.log('File:', file);
      const line = content.substring(0, match.index).split('\n').length;
      console.log('Line:', line);
      console.log('Match:', match[0]);
    }
  }
});
