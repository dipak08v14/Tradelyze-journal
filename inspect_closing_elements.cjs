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

    // Click the second trade row (Indian trade SBIN)
    await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      if (rows[1]) rows[1].click();
    });
    await new Promise(r => setTimeout(r, 8000));

    console.log("Expanding...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const expandBtn = buttons.find(b => b.textContent.includes('Expand'));
      if (expandBtn) expandBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log("Closing...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeBtn = buttons.find(b => b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000)); // wait 2 full seconds

    const hierarchy = await page.evaluate(() => {
      const results = [];
      
      // Start with the canvas element and go up to the outer wrapper
      let el = document.querySelector('canvas');
      if (!el) return { error: "Canvas not found" };

      while (el) {
        results.push({
          tag: el.tagName,
          className: el.className,
          id: el.id,
          style: el.getAttribute('style'),
          clientWidth: el.clientWidth,
          clientHeight: el.clientHeight,
          scrollWidth: el.scrollWidth,
          scrollHeight: el.scrollHeight
        });
        el = el.parentElement;
        if (results.length > 8) break;
      }
      return results;
    });

    console.log("HIERARCHY AFTER CLOSE:");
    console.log(JSON.stringify(hierarchy, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
