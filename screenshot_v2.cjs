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

    // Login and inject token
    console.log("Logging in...");
    await page.goto('http://localhost:3010/login', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token', token);
    }, tokenData);

    // 1. DASHBOARD
    console.log("Navigating to dashboard (June 2026 defaults)...");
    await page.goto('http://localhost:3010/dashboard', { waitUntil: 'networkidle2' });
    console.log("Waiting for data to load...");
    await new Promise(r => setTimeout(r, 9000));
    console.log("Taking full-page dashboard screenshot v2...");
    await page.screenshot({ path: 'dashboard-mobile-v2.png', fullPage: true });

    await browser.close();
    console.log("Dashboard screenshot v2 captured successfully!");
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
