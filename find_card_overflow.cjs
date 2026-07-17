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

    const innerOverflow = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth; // 375
      const card = document.querySelector('section.relative'); // CARD A
      if (!card) return [];

      const list = [];
      const children = card.querySelectorAll('*');
      children.forEach(el => {
        if (el.scrollWidth > 320) {
          list.push({
            tag: el.tagName,
            className: el.className,
            scrollWidth: el.scrollWidth,
            text: el.innerText ? el.innerText.slice(0, 30) : '',
            id: el.id
          });
        }
      });
      return list;
    });

    console.log("Inner CARD A elements with scrollWidth > 320:");
    console.log(JSON.stringify(innerOverflow, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
