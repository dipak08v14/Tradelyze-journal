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
    const pickerOpened = await page.evaluate(() => {
      // Find trigger button containing date text
      const buttons = Array.from(document.querySelectorAll('button'));
      const trigger = buttons.find(b => b.textContent.includes('2026') || b.textContent.includes('Jul'));
      if (trigger) {
        trigger.click();
        return true;
      }
      return false;
    });

    if (pickerOpened) {
      console.log("Opened date picker. Selecting June 2026...");
      await new Promise(r => setTimeout(r, 1500));
      
      // Specifically target selects inside the date picker dropdown
      await page.evaluate(() => {
        // Find the div with z-index: 1000
        const divs = Array.from(document.querySelectorAll('div'));
        const pickerDiv = divs.find(d => {
          const style = window.getComputedStyle(d);
          return style.zIndex === '1000' || d.style.zIndex === '1000';
        });
        
        if (pickerDiv) {
          const selects = pickerDiv.querySelectorAll('select');
          let monthSelect = null;
          let yearSelect = null;
          selects.forEach(s => {
            if (s.querySelector('option[value="5"]')) monthSelect = s; // "Jun" is value 5
            if (s.querySelector('option[value="2026"]')) yearSelect = s;
          });
          
          if (monthSelect) {
            monthSelect.value = "5";
            monthSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (yearSelect) {
            yearSelect.value = "2026";
            yearSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      console.log("Clicking Day 1 of June...");
      await page.evaluate(() => {
        const divs = Array.from(document.querySelectorAll('div'));
        const pickerDiv = divs.find(d => {
          const style = window.getComputedStyle(d);
          return style.zIndex === '1000' || d.style.zIndex === '1000';
        });
        
        if (pickerDiv) {
          const buttons = Array.from(pickerDiv.querySelectorAll('button'));
          // Get only current month buttons (with opacity near 1)
          const currentMonthDays = buttons.filter(btn => {
            const style = window.getComputedStyle(btn);
            return style.width === '30px' && style.height === '30px' && parseFloat(style.opacity) > 0.8;
          });
          
          const day1 = currentMonthDays.find(btn => btn.textContent.trim() === '1');
          if (day1) day1.click();
        }
      });
      
      await new Promise(r => setTimeout(r, 1000));
      
      console.log("Clicking Day 30 of June...");
      await page.evaluate(() => {
        const divs = Array.from(document.querySelectorAll('div'));
        const pickerDiv = divs.find(d => {
          const style = window.getComputedStyle(d);
          return style.zIndex === '1000' || d.style.zIndex === '1000';
        });
        
        if (pickerDiv) {
          const buttons = Array.from(pickerDiv.querySelectorAll('button'));
          const currentMonthDays = buttons.filter(btn => {
            const style = window.getComputedStyle(btn);
            return style.width === '30px' && style.height === '30px' && parseFloat(style.opacity) > 0.8;
          });
          
          const day30 = currentMonthDays.find(btn => btn.textContent.trim() === '30');
          if (day30) day30.click();
        }
      });
      
      console.log("Date range selection complete. Waiting for June data to load...");
      await new Promise(r => setTimeout(r, 8000));
    } else {
      console.log("Could not open date picker dropdown.");
    }

    console.log("Taking full-page dashboard screenshot with June data...");
    await page.screenshot({ path: 'dashboard-mobile.png', fullPage: true });

    // 2. TRADING LOGS
    console.log("Navigating to trading logs page...");
    await page.goto('http://localhost:3010/trading-logs', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));
    console.log("Taking trading logs screenshot...");
    await page.screenshot({ path: 'trading-logs-mobile.png', fullPage: true });

    // 3. TRADE TRACKING DETAIL
    console.log("Clicking first trade row to open Trade Tracking page...");
    const rowClicked = await page.evaluate(() => {
      const firstRow = document.querySelector('tbody tr');
      if (firstRow) {
        firstRow.click();
        return true;
      }
      return false;
    });

    if (rowClicked) {
      console.log("Row clicked. Waiting for Trade Tracking detail page to load...");
      await new Promise(r => setTimeout(r, 8000));
      console.log(`Current Detail URL: ${page.url()}`);
      console.log("Taking trade tracking detail page screenshot...");
      await page.screenshot({ path: 'trade-tracking-mobile.png', fullPage: true });
    } else {
      console.log("Could not find any row in trading logs table to click.");
    }

    // 4. STRATEGIES
    console.log("Navigating to strategies page...");
    await page.goto('http://localhost:3010/strategies', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));
    console.log("Taking strategies screenshot...");
    await page.screenshot({ path: 'strategies-mobile.png', fullPage: true });

    await browser.close();
    console.log("Screenshots captured successfully!");
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
})();
