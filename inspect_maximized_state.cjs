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

    await page.goto('http://localhost:3010/login', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token', token);
    }, tokenData);

    await page.goto('http://localhost:3010/trading-logs', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));

    await page.evaluate(() => {
      const firstRow = document.querySelector('tbody tr');
      if (firstRow) firstRow.click();
    });

    await new Promise(r => setTimeout(r, 8000));

    console.log("Expanding chart...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const expandBtn = buttons.find(b => b.textContent.includes('Expand'));
      if (expandBtn) expandBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log("Checking if Maximized Header is visible in fullscreen...");
    const isHeaderVisibleInFullscreen = await page.evaluate(() => {
      const header = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('TRADE CHART'));
      return !!header;
    });
    console.log("Header visible in fullscreen:", isHeaderVisibleInFullscreen);

    console.log("Closing chart...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeBtn = buttons.find(b => b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log("Checking if Maximized Header is still visible after close...");
    const isHeaderVisibleAfterClose = await page.evaluate(() => {
      const header = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('TRADE CHART'));
      return !!header;
    });
    const pageUrl = page.url();
    console.log("Header visible after close:", isHeaderVisibleAfterClose);
    console.log("Current Page URL:", pageUrl);

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
