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

    await page.goto('http://localhost:3010/strategies', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));

    // Get page info and check for strategies links
    const info = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent.trim(),
        href: a.getAttribute('href')
      })).filter(lnk => lnk.href && lnk.href.includes('/strategies/'));

      const trClickables = Array.from(document.querySelectorAll('tbody tr, div[class*="card"]')).map(el => {
        return el.textContent.trim();
      });

      return {
        url: window.location.href,
        htmlSummary: document.body.innerText.substring(0, 1000),
        links,
        trClickables
      };
    });

    console.log("Strategies list page status:");
    console.log(JSON.stringify(info, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
