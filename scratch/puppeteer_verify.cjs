const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <link rel="stylesheet" href="../dist/assets/index-BUIfE9L6.css">
  </head>
  <body>
    <span id="rmultiple-test" class="font-mono text-xs" style="color: var(--text-muted);">1.5R</span>
    <div id="pure-mono" class="font-mono">Pure Mono</div>
  </body>
  </html>
  `;
  
  fs.writeFileSync('scratch/test-mono.html', htmlContent);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const filePath = path.resolve('scratch/test-mono.html');
  await page.goto('file://' + filePath);
  
  const results = await page.evaluate(() => {
    const rmult = document.getElementById('rmultiple-test');
    const pure = document.getElementById('pure-mono');
    return {
      rmultiple: window.getComputedStyle(rmult).getPropertyValue('font-family'),
      pureMono: window.getComputedStyle(pure).getPropertyValue('font-family')
    };
  });
  
  console.log("=== TRADING LOGS FONT VERIFICATION ===");
  console.log("R-Multiple simulation (font-mono):", results.rmultiple);
  console.log("Pure .font-mono element:", results.pureMono);
  
  await browser.close();
})();
