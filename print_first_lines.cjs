const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'StrategiesPage.tsx');
try {
  const content = fs.readFileSync(file, 'utf8');
  console.log("File loaded. Total length:", content.length);
  console.log("First 200 characters:");
  console.log(content.substring(0, 200));
} catch (e) {
  console.error("Error reading file:", e.message);
}
