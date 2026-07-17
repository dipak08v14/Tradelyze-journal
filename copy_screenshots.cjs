const fs = require('fs');
const path = require('path');

const src1 = path.join(__dirname, 'strategies-mobile.png');
const src2 = path.join(__dirname, 'strategy-detail-mobile.png');

const destDir = 'C:\\Users\\dipak\\.gemini\\antigravity\\brain\\5d143d0c-eb59-44c9-b64a-6361a797107a';
const dest1 = path.join(destDir, 'strategies-mobile.png');
const dest2 = path.join(destDir, 'strategy-detail-mobile.png');

try {
  fs.copyFileSync(src1, dest1);
  console.log(`Copied strategies-mobile.png to ${dest1}`);
} catch (e) {
  console.error("Error copying strategies-mobile.png:", e.message);
}

try {
  fs.copyFileSync(src2, dest2);
  console.log(`Copied strategy-detail-mobile.png to ${dest2}`);
} catch (e) {
  console.error("Error copying strategy-detail-mobile.png:", e.message);
}
