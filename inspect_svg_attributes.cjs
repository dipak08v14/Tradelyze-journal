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
      const svg = document.querySelector('.recharts-surface');
      if (!svg) return { error: "SVG not found" };

      return {
        widthAttr: svg.getAttribute('width'),
        heightAttr: svg.getAttribute('height'),
        viewBoxAttr: svg.getAttribute('viewBox'),
        styleAttr: svg.getAttribute('style'),
        outerHTML: svg.outerHTML.slice(0, 300)
      };
    });

    console.log("SVG attributes:");
    console.log(JSON.stringify(result, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
