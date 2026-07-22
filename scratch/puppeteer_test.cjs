const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <link rel="stylesheet" href="../dist/assets/index-BUIfE9L6.css">
  </head>
  <body>
    <div class="text-sm">
      <div class="grid grid-cols-[2fr_3fr_2fr] py-2 items-center">
        <div id="left-col" class="font-sans whitespace-nowrap" style="color: #008F67;">12</div>
        <div id="mid-col" class="text-center font-mono uppercase tracking-wider" style="color: var(--text-muted);">Total Count</div>
      </div>
    </div>
  </body>
  </html>
  `;
  
  fs.writeFileSync('scratch/test.html', htmlContent);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const path = require('path');
  const filePath = path.resolve('scratch/test.html');
  
  await page.goto('file://' + filePath);
  
  const results = await page.evaluate(() => {
    const leftEl = document.getElementById('left-col');
    const midEl = document.getElementById('mid-col');
    const leftStyle = window.getComputedStyle(leftEl);
    const midStyle = window.getComputedStyle(midEl);
    
    const props = ['font-size', 'font-weight', 'font-family', 'letter-spacing', 'line-height', 'text-transform'];
    const data = {};
    
    for (const prop of props) {
      data[prop] = {
        left: leftStyle.getPropertyValue(prop),
        mid: midStyle.getPropertyValue(prop)
      };
    }
    return data;
  });
  
  console.log("=== COMPUTED STYLES COMPARISON ===");
  console.log(String("Property").padEnd(16) + " | " + String("Left Col (font-sans)").padEnd(25) + " | " + "Mid Col (font-mono)");
  console.log("-".repeat(70));
  
  for (const [prop, vals] of Object.entries(results)) {
    console.log(String(prop).padEnd(16) + " | " + String(vals.left).padEnd(25) + " | " + vals.mid);
  }
  
  await browser.close();
})();
