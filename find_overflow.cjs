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

    console.log("Logging in...");
    await page.goto('http://localhost:3010/login', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token', token);
    }, tokenData);

    console.log("Navigating to trading logs page...");
    await page.goto('http://localhost:3010/trading-logs', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));

    console.log("Clicking first trade row...");
    await page.evaluate(() => {
      const firstRow = document.querySelector('tbody tr');
      if (firstRow) firstRow.click();
    });

    await new Promise(r => setTimeout(r, 8000));
    console.log("Details loaded. Running overflow detection script...");

    const overflowElements = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const all = document.querySelectorAll('*');
      const overflowing = [];
      all.forEach(el => {
        if (el.scrollWidth > docWidth + 2) {
          overflowing.push({
            tag: el.tagName,
            className: typeof el.className === 'string' ? el.className.slice(0, 100) : '',
            scrollWidth: el.scrollWidth,
            id: el.id
          });
        }
      });
      return overflowing;
    });

    console.log("Overflowing elements:");
    console.log(JSON.stringify(overflowElements, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
