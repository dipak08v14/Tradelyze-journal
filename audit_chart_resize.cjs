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

    // Helper to get dimensions of ref element and inner canvas
    async function getDimensions(page) {
      return await page.evaluate(() => {
        // Find the div containing the chart (we can use the ref element directly)
        const container = document.querySelector('div[style*="position: relative"] > div[style*="width: 100%"][style*="height: 100%"]');
        if (!container) return { error: "Container not found" };

        const canvas = container.querySelector('canvas');
        return {
          containerWidth: container.clientWidth,
          containerHeight: container.clientHeight,
          canvasWidthAttr: canvas ? canvas.getAttribute('width') : null,
          canvasHeightAttr: canvas ? canvas.getAttribute('height') : null,
          canvasStyleWidth: canvas ? canvas.style.width : null,
          canvasStyleHeight: canvas ? canvas.style.height : null
        };
      });
    }

    console.log("Measuring BEFORE expand...");
    const beforeExpand = await getDimensions(page);

    console.log("Clicking Expand button...");
    await page.evaluate(() => {
      // Find Expand button
      const buttons = Array.from(document.querySelectorAll('button'));
      const expandBtn = buttons.find(b => b.textContent.includes('Expand'));
      if (expandBtn) expandBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log("Measuring IN fullscreen...");
    const duringExpand = await getDimensions(page);

    console.log("Clicking Close button...");
    await page.evaluate(() => {
      // Find Close button
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeBtn = buttons.find(b => b.textContent.includes('Close'));
      if (closeBtn) {
        closeBtn.click();
      } else {
        console.log("Close button not found!");
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log("Measuring AFTER close...");
    const afterClose = await getDimensions(page);

    console.log("AUDIT RESULTS:");
    console.log(JSON.stringify({
      beforeExpand,
      duringExpand,
      afterClose
    }, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
