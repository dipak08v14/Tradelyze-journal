const fs = require('fs');
const path = require('path');

function searchFile(dir, fileName) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        const res = searchFile(fullPath, fileName);
        if (res) return res;
      }
    } else if (file === fileName) {
      return fullPath;
    }
  }
  return null;
}

const projRoot = path.join(__dirname);
const radarChartPath = searchFile(projRoot, 'RadarScoreChart.tsx') || searchFile(projRoot, 'RadarScoreChart.jsx');
console.log(`RadarScoreChart file path: ${radarChartPath}`);

if (radarChartPath) {
  const content = fs.readFileSync(radarChartPath, 'utf8');
  console.log("Checking for width/sizing in RadarScoreChart:");
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('width') || l.includes('height') || l.includes('svg') || l.includes('Svg') || l.includes('ResponsiveContainer') || l.includes('416')) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  });
}
