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

    // Get all trade links or rows
    const tradeUrls = await page.evaluate(() => {
      // Find all trade log row click destinations or links
      // The table rows have click handlers that navigate. Let's get the IDs or row indices
      return Array.from(document.querySelectorAll('tbody tr')).map((tr, idx) => idx);
    });

    console.log(`Found ${tradeUrls.length} trades in the list.`);

    let foundIndianTrade = false;
    let indianTradeUrl = '';

    for (let idx of tradeUrls) {
      console.log(`Checking trade row at index ${idx}...`);
      await page.goto('http://localhost:3010/trading-logs', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 3000));

      await page.evaluate((i) => {
        const rows = document.querySelectorAll('tbody tr');
        if (rows[i]) rows[i].click();
      }, idx);

      await new Promise(r => setTimeout(r, 5000));

      const isIndian = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        const container = document.querySelector('div.tl-chart-iframe');
        return !iframe && !!container;
      });

      if (isIndian) {
        foundIndianTrade = true;
        indianTradeUrl = page.url();
        console.log(`Found Indian trade! URL: ${indianTradeUrl}`);
        break;
      }
    }

    if (!foundIndianTrade) {
      console.log("No Indian trade found in the list. Running measurements on the default first trade (which is iframe-based).");
      // Let's just click the first row
      await page.goto('http://localhost:3010/trading-logs', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 4000));
      await page.evaluate(() => {
        const firstRow = document.querySelector('tbody tr');
        if (firstRow) firstRow.click();
      });
      await new Promise(r => setTimeout(r, 6000));
    }

    // Measure function
    async function getDimensions() {
      return await page.evaluate(() => {
        // Find container and canvas
        const container = document.querySelector('div[ref*="Container"]') || document.querySelector('div.tl-chart-iframe > div');
        const canvas = document.querySelector('canvas');
        const containerEl = document.querySelector('div.tl-chart-iframe');
        return {
          containerWidth: container ? container.clientWidth : (containerEl ? containerEl.clientWidth : null),
          containerHeight: container ? container.clientHeight : (containerEl ? containerEl.clientHeight : null),
          canvasWidthAttr: canvas ? canvas.getAttribute('width') : null,
          canvasHeightAttr: canvas ? canvas.getAttribute('height') : null,
          canvasStyleWidth: canvas ? canvas.style.width : null,
          canvasStyleHeight: canvas ? canvas.style.height : null
        };
      });
    }

    console.log("BEFORE EXPAND:");
    console.log(await getDimensions());

    console.log("Expanding...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const expandBtn = buttons.find(b => b.textContent.includes('Expand'));
      if (expandBtn) expandBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log("IN FULLSCREEN:");
    console.log(await getDimensions());

    console.log("Closing...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeBtn = buttons.find(b => b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log("AFTER CLOSE:");
    console.log(await getDimensions());

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
