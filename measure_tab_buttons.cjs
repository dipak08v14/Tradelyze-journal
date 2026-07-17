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

    // Log in first
    await page.goto('http://localhost:3010/login', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token', token);
    }, tokenData);

    const runMeasurement = async (width, height) => {
      await page.setViewport({ width, height, isMobile: width <= 600, hasTouch: width <= 600 });
      await page.goto('http://localhost:3010/strategies', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 6000));

      return await page.evaluate(() => {
        const results = [];
        const myStrategiesBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'My Strategies');
        const filtersBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Filters'));
        const listBtn = document.querySelector('button[title="List Table View"]');
        const gridBtn = document.querySelector('button[title="Grid Minimal View"]');
        [['My Strategies', myStrategiesBtn], ['Filters', filtersBtn], ['List toggle', listBtn], ['Grid toggle', gridBtn]].forEach(([name, el]) => {
          if (el) {
            const rect = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            results.push({ name, width: rect.width, height: rect.height, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight, fontSize: cs.fontSize, border: cs.border });
          } else {
            results.push({ name, error: 'not found' });
          }
        });
        return results;
      });
    };

    console.log("MEASUREMENTS AT 375px:");
    const res375 = await runMeasurement(375, 812);
    console.log(JSON.stringify(res375, null, 2));

    console.log("\nMEASUREMENTS AT 1280px:");
    const res1280 = await runMeasurement(1280, 800);
    console.log(JSON.stringify(res1280, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
