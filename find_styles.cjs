const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

const buttonStats = {};
const inputStats = {};
const selectStats = {};

for (const file of files) {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
  
  // Find style attributes
  const inputMatches = content.match(/<input[^>]*?(?:style={{([^}]+)}}|className="([^"]+)")/g) || [];
  const buttonMatches = content.match(/<button[^>]*?(?:style={{([^}]+)}}|className="([^"]+)")/g) || [];
  const selectMatches = content.match(/<select[^>]*?(?:style={{([^}]+)}}|className="([^"]+)")/g) || [];
  
  inputMatches.forEach(m => {
    inputStats[m] = (inputStats[m] || 0) + 1;
  });
  buttonMatches.forEach(m => {
    buttonStats[m] = (buttonStats[m] || 0) + 1;
  });
  selectMatches.forEach(m => {
    selectStats[m] = (selectStats[m] || 0) + 1;
  });
}

console.log("TOP INPUT STYLES:");
Object.entries(inputStats).sort((a,b) => b[1] - a[1]).slice(0, 5).forEach(([style, count]) => {
  console.log(`[${count} times] ${style.trim()}`);
});

console.log("\nTOP BUTTON STYLES:");
Object.entries(buttonStats).sort((a,b) => b[1] - a[1]).slice(0, 5).forEach(([style, count]) => {
  console.log(`[${count} times] ${style.trim()}`);
});

console.log("\nTOP SELECT STYLES:");
Object.entries(selectStats).sort((a,b) => b[1] - a[1]).slice(0, 5).forEach(([style, count]) => {
  console.log(`[${count} times] ${style.trim()}`);
});
