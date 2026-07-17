const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    const tokenData = fs.readFileSync('session_token.json', 'utf8');

    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

    // Login and inject token
    console.log("Logging in...");
    await page.goto('http://localhost:3010/login', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token', token);
    }, tokenData);

    // Navigating to logs and clicking the first row
    console.log("Navigating to trading logs page...");
    await page.goto('http://localhost:3010/trading-logs', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));

    console.log("Clicking first trade row...");
    const rowClicked = await page.evaluate(() => {
      const firstRow = document.querySelector('tbody tr');
      if (firstRow) {
        firstRow.click();
        return true;
      }
      return false;
    });

    if (rowClicked) {
      console.log("Row clicked. Waiting for Trade Tracking detail page to load...");
      await new Promise(r => setTimeout(r, 8000));
      console.log(`Current Detail URL: ${page.url()}`);
      
      console.log("Taking trade tracking detail page screenshot v3 (Stats tab active)...");
      await page.screenshot({ path: 'trade-tracking-mobile-v3.png', fullPage: true });

      console.log("Clicking Market tab button...");
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const marketBtn = buttons.find(b => b.textContent.includes('Market'));
        if (marketBtn) {
          marketBtn.click();
        }
      });

      await new Promise(r => setTimeout(r, 2000));
      console.log("Taking trade tracking detail page screenshot v3 (Market tab active)...");
      await page.screenshot({ path: 'trade-tracking-mobile-v3-market.png', fullPage: true });
    } else {
      console.log("Could not find any row in trading logs table to click.");
    }

    await browser.close();
    console.log("All tracking screenshots v3 captured successfully!");
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
