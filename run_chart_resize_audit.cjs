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
    
    // Capture console.logs
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[DEBUG_RESIZE]') || text.includes('resize exists:') || text.includes('container dimensions:')) {
        consoleLogs.push(text);
      }
    });

    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

    await page.goto('http://localhost:3010/login', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token', token);
    }, tokenData);

    // Go directly to the Indian trade detail page
    // Using the Indian trade URL found earlier: http://localhost:3010/trading-logs/4fe676ce-7f3d-437b-a705-40af8c977eaf
    await page.goto('http://localhost:3010/trading-logs/4fe676ce-7f3d-437b-a705-40af8c977eaf', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 8000));

    // Helper to get dimensions of ref element and all canvas elements
    async function getDimensions() {
      return await page.evaluate(() => {
        const container = document.querySelector('div.tl-chart-iframe');
        if (!container) return { error: "Container div.tl-chart-iframe not found" };

        const refDiv = container.querySelector('div[style*="width: 100%"][style*="height: 100%"]') || container.querySelector('div.tv-lightweight-charts').parentElement;
        
        const canvases = Array.from(container.querySelectorAll('canvas')).map((canvas, i) => {
          return {
            index: i,
            widthAttr: canvas.getAttribute('width'),
            heightAttr: canvas.getAttribute('height'),
            styleWidth: canvas.style.width,
            styleHeight: canvas.style.height
          };
        });

        return {
          containerWidth: container.clientWidth,
          containerHeight: container.clientHeight,
          refDivWidth: refDiv ? refDiv.clientWidth : null,
          refDivHeight: refDiv ? refDiv.clientHeight : null,
          canvases
        };
      });
    }

    console.log("Measuring BEFORE EXPAND...");
    const beforeExpand = await getDimensions();

    console.log("Clicking Expand...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const expandBtn = buttons.find(b => b.textContent.includes('Expand'));
      if (expandBtn) expandBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    console.log("Measuring IN FULLSCREEN...");
    const duringExpand = await getDimensions();

    console.log("Clicking Close...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeBtn = buttons.find(b => b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log("Measuring AFTER CLOSE...");
    const afterClose = await getDimensions();

    console.log("BROWSER CONSOLE LOGS:");
    console.log(consoleLogs.join('\n'));

    console.log("\nRAW MEASUREMENTS:");
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
