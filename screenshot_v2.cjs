const puppeteer = require('./node_modules/puppeteer');
const path = require('path');

const OUT = 'C:\\Users\\dipak\\.gemini\\antigravity\\brain\\5781b54d-1333-4649-abbe-6fc3187be13b\\scratch\\v2';
require('fs').mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name) });
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-web-security'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto('http://localhost:3010/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500)); // let fonts/layout settle

  // 01 — Navbar + Hero top
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 400));
  await shot(page, '01_hero_top.png');

  // Simulate mousemove in hero to test cursor glow
  await page.mouse.move(640, 300);
  await new Promise(r => setTimeout(r, 200));
  await page.mouse.move(400, 200);
  await new Promise(r => setTimeout(r, 800)); // let glow follow
  await shot(page, '01b_hero_glow_moved.png');

  // 02 — Hero mockup (scroll down to show dashboard)
  await page.evaluate(() => window.scrollTo(0, 520));
  await new Promise(r => setTimeout(r, 400));
  await shot(page, '02_hero_mockup.png');

  // Test TiltCard hover on dashboard mockup
  const dashBox = await page.evaluate(() => {
    const el = document.querySelector('[data-lp] section:first-of-type div[style*="perspective"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  });
  if (dashBox) {
    await page.mouse.move(dashBox.x - 100, dashBox.y - 60);
    await new Promise(r => setTimeout(r, 300));
    await shot(page, '02b_hero_tilt_test.png');
    await page.mouse.move(dashBox.x, dashBox.y); // reset
  }

  // 03 — Trust bar
  await page.evaluate(() => {
    const el = document.getElementById('features');
    const prev = el?.previousElementSibling;
    if (prev) prev.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 500));
  await shot(page, '03_trust_bar.png');

  // 04 — Feature 1 (Journal) - light section
  await page.evaluate(() => {
    const sections = document.querySelectorAll('#features section');
    if (sections[0]) sections[0].scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, '04_feature1_journal.png');

  // 05 — Feature 2 (Reports) - dark section
  await page.evaluate(() => {
    const sections = document.querySelectorAll('#features section');
    if (sections[1]) sections[1].scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, '05_feature2_reports.png');

  // 06 — Feature 3 (Strategy) - light section
  await page.evaluate(() => {
    const sections = document.querySelectorAll('#features section');
    if (sections[2]) sections[2].scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, '06_feature3_strategy.png');

  // 07 — Feature 4 (Visual Match) - dark, featured
  await page.evaluate(() => {
    const sections = document.querySelectorAll('#features section');
    if (sections[3]) sections[3].scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, '07_feature4_visual_match.png');

  // 08 — Feature 5 (AI Teacher) - dark, beta
  await page.evaluate(() => {
    const sections = document.querySelectorAll('#features section');
    if (sections[4]) sections[4].scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, '08_feature5_ai_teacher.png');

  // 09 — Comparison table
  await page.evaluate(() => window.scrollBy(0, 1000));
  await new Promise(r => setTimeout(r, 600));
  await shot(page, '09_comparison_table.png');

  // 10 — Pricing
  await page.evaluate(() => {
    const el = document.getElementById('pricing');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, '10_pricing.png');

  // 11 — Final CTA + Footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 600));
  await shot(page, '11_cta_footer.png');

  // Test magnetic button hover (CTA section)
  const ctaBtn = await page.evaluate(() => {
    const btns = document.querySelectorAll('[data-lp] button');
    let found = null;
    btns.forEach(b => { if (b.textContent?.includes('Start Free Trial') && b.closest('section:last-of-type')) found = b; });
    if (!found) btns.forEach(b => { if (b.textContent?.includes('Start Free Trial')) found = b; });
    if (!found) return null;
    const r = found.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (ctaBtn) {
    // Move close to button to trigger magnetic effect
    await page.mouse.move(ctaBtn.x + 40, ctaBtn.y + 20);
    await new Promise(r => setTimeout(r, 400));
    await shot(page, '11b_magnetic_btn_test.png');
  }

  // 12 — Full page overview
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '00_full_page.png'), fullPage: true });

  await browser.close();
  console.log('All screenshots saved to', OUT);
}

run().catch(e => { console.error(e.message); process.exit(1); });
