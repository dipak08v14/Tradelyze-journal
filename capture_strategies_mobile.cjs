const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const tokenData = fs.readFileSync('session_token.json', 'utf8');

    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          url: page.url(),
          text: msg.text()
        });
      }
    });

    await page.goto('http://localhost:3010/login', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token', token);
    }, tokenData);

    // --- STRATEGIES LIST PAGE ---
    console.log("Navigating to Strategies List page...");
    await page.goto('http://localhost:3010/strategies', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));

    // Capture screenshot
    const screenshotDir = __dirname;
    const listImgPath = path.join(screenshotDir, 'strategies-mobile.png');
    await page.screenshot({ path: listImgPath, fullPage: true });
    console.log(`Saved screenshot to: ${listImgPath}`);

    // Detect overflows on list page
    const listOverflows = await page.evaluate(() => {
      const overflows = [];
      const documentWidth = document.documentElement.clientWidth;
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        if (el.scrollWidth > documentWidth && el.clientWidth > 0) {
          overflows.push({
            tagName: el.tagName,
            className: el.className,
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            textPreview: el.innerText ? el.innerText.substring(0, 50).replace(/\n/g, ' ') : ''
          });
        }
      });
      return overflows;
    });

    // Find the link to navigate to from row clicks
    // We can evaluate the page to find an ID or trigger a click on row index 2 ("Morning Top Reversal")
    console.log("Clicking row index 2 to go to Strategy Detail page...");
    await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      if (rows[2]) {
        rows[2].click();
      } else if (rows[0]) {
        rows[0].click();
      }
    });
    
    // Wait for detail page navigation to settle
    await new Promise(r => setTimeout(r, 6000));
    console.log("Current Page URL:", page.url());

    // Capture screenshot
    const detailImgPath = path.join(screenshotDir, 'strategy-detail-mobile.png');
    await page.screenshot({ path: detailImgPath, fullPage: true });
    console.log(`Saved screenshot to: ${detailImgPath}`);

    // Detect overflows on detail page
    const detailOverflows = await page.evaluate(() => {
      const overflows = [];
      const documentWidth = document.documentElement.clientWidth;
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        if (el.scrollWidth > documentWidth && el.clientWidth > 0) {
          overflows.push({
            tagName: el.tagName,
            className: el.className,
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            textPreview: el.innerText ? el.innerText.substring(0, 50).replace(/\n/g, ' ') : ''
          });
        }
      });
      return overflows;
    });

    console.log("\nCONSOLE ERRORS DETECTED:");
    console.log(JSON.stringify(consoleErrors, null, 2));

    console.log("\nSTRATEGIES LIST PAGE OVERFLOWS:");
    console.log(JSON.stringify(listOverflows, null, 2));

    console.log("\nSTRATEGY DETAIL PAGE OVERFLOWS:");
    console.log(JSON.stringify(detailOverflows, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
