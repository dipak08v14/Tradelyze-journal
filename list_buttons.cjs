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

    console.log("Maximizing...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const expandBtn = buttons.find(b => b.textContent.includes('Expand'));
      if (expandBtn) expandBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const buttonTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent,
        visible: b.clientWidth > 0 && b.clientHeight > 0,
        className: b.className
      }));
    });

    console.log("All buttons on the page while maximized:");
    console.log(JSON.stringify(buttonTexts, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
