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
    console.log("Navigating to dashboard...");
    await page.goto('http://localhost:3010/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));

    // Interact with date picker
    console.log("Interacting with date picker...");
    const clickedOpen = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const trigger = buttons.find(b => b.textContent.includes('2026') || b.textContent.includes('Jul'));
      if (trigger) {
        trigger.click();
        return true;
      }
      return false;
    });

    if (clickedOpen) {
      console.log("Opened date picker. Selecting June 2026...");
      await new Promise(r => setTimeout(r, 1000));
      
      await page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        let monthSelect = null;
        let yearSelect = null;
        selects.forEach(s => {
          if (s.querySelector('option[value="5"]')) {
            monthSelect = s;
          }
          if (s.querySelector('option[value="2026"]')) {
            yearSelect = s;
          }
        });
        
        if (monthSelect) {
          monthSelect.value = "5"; // June (0-indexed is 5)
          monthSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (yearSelect) {
          yearSelect.value = "2026";
          yearSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      await new Promise(r => setTimeout(r, 1500));
      
      console.log("Clicking Day 1 and Day 30...");
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const currentMonthDays = buttons.filter(btn => {
          const style = window.getComputedStyle(btn);
          const opacity = style.opacity;
          return style.width === '30px' && style.height === '30px' && parseFloat(opacity) > 0.8;
        });
        
        const day1 = currentMonthDays.find(btn => btn.textContent.trim() === '1');
        if (day1) day1.click();
      });
      
      await new Promise(r => setTimeout(r, 800));
      
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const currentMonthDays = buttons.filter(btn => {
          const style = window.getComputedStyle(btn);
          const opacity = style.opacity;
          return style.width === '30px' && style.height === '30px' && parseFloat(opacity) > 0.8;
        });
        
        const day30 = currentMonthDays.find(btn => btn.textContent.trim() === '30');
        if (day30) day30.click();
      });
      
      console.log("Selected range. Waiting for data to refresh...");
      await new Promise(r => setTimeout(r, 7000));
    } else {
      console.log("Could not find date picker trigger button.");
    }

    console.log("Taking dashboard screenshot...");
    await page.screenshot({ path: 'dashboard-mobile.png', fullPage: true });

    // 2. TRADING LOGS
    console.log("Navigating to trading logs...");
    await page.goto('http://localhost:3010/trading-logs', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));
    console.log("Taking trading logs screenshot...");
    await page.screenshot({ path: 'trading-logs-mobile.png', fullPage: true });

    // Extract a trade detail link
    console.log("Extracting trade ID/link...");
    const tradeLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const tradeDetailLink = links.find(l => 
        l.href.includes('/trading-logs/') || 
        l.href.includes('/trade/') || 
        l.href.includes('/trade-tracking/')
      );
      return tradeDetailLink ? tradeDetailLink.href : null;
    });

    // 3. STRATEGIES
    console.log("Navigating to strategies...");
    await page.goto('http://localhost:3010/strategies', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));
    console.log("Taking strategies screenshot...");
    await page.screenshot({ path: 'strategies-mobile.png', fullPage: true });

    // 4. TRADE TRACKING
    if (tradeLink) {
      console.log(`Navigating to trade tracking link: ${tradeLink}`);
      await page.goto(tradeLink, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 6000));
      console.log("Taking trade tracking screenshot...");
      await page.screenshot({ path: 'trade-tracking-mobile.png', fullPage: true });
    } else {
      console.log("Could not find any trade link on the trading logs page to capture trade tracking detail.");
    }

    await browser.close();
    console.log("All screenshots captured successfully!");
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
