const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const consoleErrors = [];
  try {
    const tokenData = fs.readFileSync('session_token.json', 'utf8');

    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Set token
    await page.goto('http://localhost:3010/login', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token', token);
    }, tokenData);

    // Go to notebook page
    await page.goto('http://localhost:3010/notebook', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4000)); // wait 4 seconds for rendering

    const artDir = 'C:\\Users\\dipak\\.gemini\\antigravity\\brain\\5d143d0c-eb59-44c9-b64a-6361a797107a';
    const screenshotPath = path.join(artDir, 'notebook-mobile.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to: ${screenshotPath}`);

    console.log("Console Errors detected during run:");
    console.log(JSON.stringify(consoleErrors, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
