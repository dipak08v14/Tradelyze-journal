const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  // Find the new CSS file dynamically
  const cssDir = path.resolve('dist/assets');
  const files = fs.readdirSync(cssDir);
  const cssFile = files.find(f => f.endsWith('.css'));
  if (!cssFile) throw new Error("CSS file not found in dist/assets");

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <link rel="stylesheet" href="../dist/assets/${cssFile}">
  </head>
  <body>
    <!-- 1. Trading Logs R-Multiple column -->
    <span id="rmultiple" class="font-mono text-xs">1.5R</span>
    
    <!-- 2. Wins vs Losses middle-column label -->
    <div id="wins-losses-label" class="text-center font-mono uppercase tracking-wider">Total Count</div>
    
    <!-- 3. font-display test -->
    <h1 id="page-title" class="font-display text-4xl">Dashboard</h1>
    
    <!-- 4. Default font sanity check -->
    <p id="default-text">Normal body text</p>
  </body>
  </html>
  `;
  
  fs.writeFileSync('scratch/test-fonts.html', htmlContent);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const filePath = path.resolve('scratch/test-fonts.html');
  await page.goto('file://' + filePath);
  
  const results = await page.evaluate(() => {
    const getFont = (id) => window.getComputedStyle(document.getElementById(id)).getPropertyValue('font-family');
    return {
      rmultiple: getFont('rmultiple'),
      winsLossesLabel: getFont('wins-losses-label'),
      pageTitle: getFont('page-title'),
      defaultText: getFont('default-text')
    };
  });
  
  console.log("=== COMPREHENSIVE FONT VERIFICATION ===");
  console.log("1. Trading Logs R-Multiple column (font-mono):", results.rmultiple);
  console.log("2. Wins vs Losses label (font-mono):", results.winsLossesLabel);
  console.log("3. Page Title (font-display):", results.pageTitle);
  console.log("4. Default Body Text (no classes):", results.defaultText);
  
  await browser.close();
})();
