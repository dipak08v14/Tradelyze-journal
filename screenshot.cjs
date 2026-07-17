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
    
    // Set viewport to iPhone SE
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

    // Navigate to login page first to establish local storage context
    console.log("Navigating to http://localhost:3010/login...");
    await page.goto('http://localhost:3010/login', { waitUntil: 'networkidle2' });

    // Inject token
    console.log("Injecting token into localStorage...");
    await page.evaluate((token) => {
      localStorage.setItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token', token);
    }, tokenData);

    // Verify localStorage was set correctly
    const savedToken = await page.evaluate(() => localStorage.getItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token'));
    if (!savedToken) {
      console.error("Token injection into localStorage failed (null).");
    } else {
      console.log("Token successfully written to localStorage.");
    }

    // Navigate to dashboard
    console.log("Navigating to dashboard...");
    await page.goto('http://localhost:3010/dashboard', { waitUntil: 'networkidle2' });

    // Wait for the app to initialize, fetch supabase, and render charts
    console.log("Waiting for dashboard page load and API calls...");
    await new Promise(r => setTimeout(r, 7000));

    const dashboardUrl = page.url();
    console.log(`Current URL: ${dashboardUrl}`);
    if (dashboardUrl.includes('/login')) {
      console.error("Authentication failed: Redirected to /login.");
      await page.screenshot({ path: 'login-redirect-mobile.png' });
      await browser.close();
      process.exit(1);
    }

    console.log("Capturing full-page dashboard-mobile.png...");
    await page.screenshot({ path: 'dashboard-mobile.png', fullPage: true });

    // Navigate to trade entry
    console.log("Navigating to trade entry page...");
    await page.goto('http://localhost:3010/trade-entry', { waitUntil: 'networkidle2' });

    console.log("Waiting for trade entry page load...");
    await new Promise(r => setTimeout(r, 7000));

    console.log(`Current URL: ${page.url()}`);
    console.log("Capturing full-page trade-entry-mobile.png...");
    await page.screenshot({ path: 'trade-entry-mobile.png', fullPage: true });

    await browser.close();
    console.log("Screenshot process finished successfully!");
  } catch (error) {
    console.error("Script encountered an error:", error);
    process.exit(1);
  }
})();
