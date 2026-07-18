import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, '\nSTACK:', error.stack));
  
  try {
    await page.goto('http://localhost:3010/trading-logs', { waitUntil: 'networkidle2' });
  } catch(e) {
    console.error('NAV ERROR', e);
  }
  await browser.close();
})();
