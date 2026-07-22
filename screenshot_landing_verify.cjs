const puppeteer = require('./node_modules/puppeteer');
const path = require('path');

const OUT_DIR = 'C:\\Users\\dipak\\.gemini\\antigravity\\brain\\5781b54d-1333-4649-abbe-6fc3187be13b\\scratch';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto('http://localhost:3010/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for fonts/layout
  await new Promise(r => setTimeout(r, 2500));

  // 1. Hero top (navbar + badge + headline + CTAs)
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT_DIR, '01_hero_top.png') });

  // 2. Hero mockup (dashboard UI mockup)
  await page.evaluate(() => window.scrollTo(0, 550));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT_DIR, '02_hero_mockup.png') });

  // 3. Three Layers section
  await page.evaluate(() => {
    const el = document.querySelector('#how-it-works');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, '03_three_layers.png') });

  // 4. Key Differentiators
  await page.evaluate(() => window.scrollBy(0, 950));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, '04_differentiators.png') });

  // 5. Comparison table
  await page.evaluate(() => window.scrollBy(0, 950));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, '05_comparison_table.png') });

  // 6. Pricing
  await page.evaluate(() => window.scrollBy(0, 950));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, '06_pricing.png') });

  // 7. Final CTA + Footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, '07_cta_footer.png') });

  // Full page
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT_DIR, '00_full_page.png'), fullPage: true });

  await browser.close();
  console.log('Done — screenshots in', OUT_DIR);
}

run().catch(err => { console.error(err.message); process.exit(1); });
