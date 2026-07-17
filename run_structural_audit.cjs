const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    const tokenData = fs.readFileSync('session_token.json', 'utf8');

    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Helper function to detect overflow
    async function detectOverflow(page, label) {
      return await page.evaluate((lbl) => {
        const docWidth = document.documentElement.clientWidth;
        const all = document.querySelectorAll('*');
        const overflowing = [];
        all.forEach(el => {
          if (el.scrollWidth > docWidth + 2) {
            overflowing.push({
              tag: el.tagName,
              className: typeof el.className === 'string' ? el.className.slice(0, 100) : '',
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              id: el.id
            });
          }
        });
        return {
          label: lbl,
          docWidth: docWidth,
          overflowingCount: overflowing.length,
          overflowing: overflowing.slice(0, 10) // limit output size
        };
      }, label);
    }

    const page = await browser.newPage();

    // Login
    await page.goto('http://localhost:3010/login', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token', token);
    }, tokenData);

    const auditResults = {};

    // ============================================
    // TEST CASE 1: Trade Tracking detail page
    // ============================================
    // Go to logs and click first row to navigate to details
    await page.goto('http://localhost:3010/trading-logs', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));
    await page.evaluate(() => {
      const firstRow = document.querySelector('tbody tr');
      if (firstRow) firstRow.click();
    });
    await new Promise(r => setTimeout(r, 8000));
    
    // a) 375px
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 2000));
    auditResults.tracking_375 = await detectOverflow(page, "TradeTracking 375px");

    // b) 1920px
    await page.setViewport({ width: 1920, height: 1080, isMobile: false, hasTouch: false });
    await new Promise(r => setTimeout(r, 2000));
    auditResults.tracking_1920 = await detectOverflow(page, "TradeTracking 1920px");

    // ============================================
    // TEST CASE 2: Dashboard Page
    // ============================================
    await page.goto('http://localhost:3010/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4000));

    // a) 375px
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 2000));
    auditResults.dashboard_375 = await detectOverflow(page, "Dashboard 375px");

    // b) 1920px
    await page.setViewport({ width: 1920, height: 1080, isMobile: false, hasTouch: false });
    await new Promise(r => setTimeout(r, 2000));
    auditResults.dashboard_1920 = await detectOverflow(page, "Dashboard 1920px");

    console.log(JSON.stringify(auditResults, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
