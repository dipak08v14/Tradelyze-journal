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

    // --- STRATEGIES LIST PAGE ---
    console.log("Auditing Strategies List page overflows...");
    await page.goto('http://localhost:3010/strategies', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));

    const listOverflows = await page.evaluate(() => {
      const overflows = [];
      const documentWidth = document.documentElement.clientWidth;
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        // Exclude elements with overflow-x-auto or overflow-x-scroll since they manage overflow internally
        const style = window.getComputedStyle(el);
        const hasHorizontalScroll = style.overflowX === 'auto' || style.overflowX === 'scroll';
        
        if (el.scrollWidth > documentWidth && el.clientWidth > 0 && !hasHorizontalScroll) {
          // Check if any ancestor has horizontal scroll to be absolutely sure
          let parent = el.parentElement;
          let isManaged = false;
          while (parent) {
            const pStyle = window.getComputedStyle(parent);
            if (pStyle.overflowX === 'auto' || pStyle.overflowX === 'scroll') {
              isManaged = true;
              break;
            }
            parent = parent.parentElement;
          }
          
          if (!isManaged) {
            overflows.push({
              tagName: el.tagName,
              className: el.className,
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              textPreview: el.innerText ? el.innerText.substring(0, 50).replace(/\n/g, ' ') : ''
            });
          }
        }
      });
      return overflows;
    });

    // --- STRATEGY DETAIL PAGE ---
    console.log("Auditing Strategy Detail page overflows...");
    await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      if (rows[2]) {
        rows[2].click();
      } else if (rows[0]) {
        rows[0].click();
      }
    });
    await new Promise(r => setTimeout(r, 6000));
    console.log("Current Page URL:", page.url());

    const detailOverflows = await page.evaluate(() => {
      const overflows = [];
      const documentWidth = document.documentElement.clientWidth;
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const hasHorizontalScroll = style.overflowX === 'auto' || style.overflowX === 'scroll';
        
        if (el.scrollWidth > documentWidth && el.clientWidth > 0 && !hasHorizontalScroll) {
          let parent = el.parentElement;
          let isManaged = false;
          while (parent) {
            const pStyle = window.getComputedStyle(parent);
            if (pStyle.overflowX === 'auto' || pStyle.overflowX === 'scroll') {
              isManaged = true;
              break;
            }
            parent = parent.parentElement;
          }
          
          if (!isManaged) {
            overflows.push({
              tagName: el.tagName,
              className: el.className,
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              textPreview: el.innerText ? el.innerText.substring(0, 50).replace(/\n/g, ' ') : ''
            });
          }
        }
      });
      return overflows;
    });

    console.log("\n--- UNMANAGED STRATEGIES LIST PAGE OVERFLOWS ---");
    console.log(JSON.stringify(listOverflows, null, 2));

    console.log("\n--- UNMANAGED STRATEGY DETAIL PAGE OVERFLOWS ---");
    console.log(JSON.stringify(detailOverflows, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
