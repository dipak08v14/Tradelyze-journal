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

    // 1. DASHBOARD
    console.log("Navigating to dashboard (June 2026 defaults)...");
    await page.goto('http://localhost:3010/dashboard', { waitUntil: 'networkidle2' });
    console.log("Waiting for data to load...");
    await new Promise(r => setTimeout(r, 8000));
    console.log("Taking full-page dashboard screenshot...");
    await page.screenshot({ path: 'dashboard-mobile.png', fullPage: true });

    // 2. TRADING LOGS
    console.log("Navigating to trading logs page...");
    await page.goto('http://localhost:3010/trading-logs', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));
    console.log("Taking trading logs screenshot...");
    await page.screenshot({ path: 'trading-logs-mobile.png', fullPage: true });

    // 3. TRADE TRACKING DETAIL
    console.log("Clicking first trade row to open Trade Tracking page...");
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
      console.log("Taking trade tracking detail page screenshot...");
      await page.screenshot({ path: 'trade-tracking-mobile.png', fullPage: true });
    } else {
      console.log("Could not find any row in trading logs table to click.");
    }

    // 4. STRATEGIES
    console.log("Navigating to strategies page...");
    await page.goto('http://localhost:3010/strategies', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));
    console.log("Taking strategies screenshot...");
    await page.screenshot({ path: 'strategies-mobile.png', fullPage: true });

    await browser.close();
    console.log("Screenshots captured successfully!");
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
