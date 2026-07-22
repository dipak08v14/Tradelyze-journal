const puppeteer = require('./node_modules/puppeteer');
const path = require('path');

const SCREENSHOT_PATH = 'C:\\Users\\dipak\\.gemini\\antigravity\\brain\\8021c6da-d2c4-4c7e-90d9-66341d8a12cc\\navbar_dropdown.png';

async function run() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 600 });

  console.log("Navigating to http://localhost:3010/...");
  await page.goto('http://localhost:3010/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait 2 seconds for layout/fonts
  await new Promise(r => setTimeout(r, 2000));

  console.log("Hovering over Products button (#nav-products-btn)...");
  await page.hover('#nav-products-btn');

  // Wait 1 second for dropdown hover animation/transition
  await new Promise(r => setTimeout(r, 1000));

  console.log(`Taking screenshot and saving to: ${SCREENSHOT_PATH}...`);
  await page.screenshot({ path: SCREENSHOT_PATH });

  await browser.close();
  console.log("Done successfully!");
}

run().catch(err => {
  console.error("Error occurred:", err);
  process.exit(1);
});
