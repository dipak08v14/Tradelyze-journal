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
      if (!svg) return { error: 'SVG not found' };
      const svgRect = svg.getBoundingClientRect();
      const labels = document.querySelectorAll('.recharts-polar-angle-axis-tick-value');
      const labelData = Array.from(labels).map(label => {
        const rect = label.getBoundingClientRect();
        return {
          text: label.textContent,
          left: rect.left,
          right: rect.right,
          svgLeft: svgRect.left,
          svgRight: svgRect.right,
          overflowsLeft: rect.left < svgRect.left,
          overflowsRight: rect.right > svgRect.right,
          overflowAmount: Math.max(0, svgRect.left - rect.left, rect.right - svgRect.right)
        };
      });
      return {
        svgBoundingRect: { left: svgRect.left, right: svgRect.right, width: svgRect.width },
        svgWidthAttribute: svg.getAttribute('width'),
        documentWidth: document.documentElement.clientWidth,
        labels: labelData
      };
    });

    console.log(JSON.stringify(result, null, 2));

    await browser.close();
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
