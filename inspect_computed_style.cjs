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

    const result = await page.evaluate(() => {
      const el = document.querySelector('div.w-full.sm\\:w-\\[416px\\]');
      if (!el) return { error: "Element not found" };

      const computedStyle = window.getComputedStyle(el);
      
      const children = Array.from(el.querySelectorAll('*')).map(c => ({
        tag: c.tagName,
        className: c.className,
        style: c.getAttribute('style'),
        clientWidth: c.clientWidth,
        scrollWidth: c.scrollWidth,
        computedWidth: window.getComputedStyle(c).width
      }));

      return {
        tag: el.tagName,
        className: el.className,
        style: el.getAttribute('style'),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        computedWidth: computedStyle.width,
        computedMinWidth: computedStyle.minWidth,
        computedMaxWidth: computedStyle.maxWidth,
        parentTag: el.parentElement.tagName,
        parentClassName: el.parentElement.className,
        parentWidth: window.getComputedStyle(el.parentElement).width,
        children: children
      };
    });

    console.log("Computed details of Performance Score card:");
    console.log(JSON.stringify(result, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
