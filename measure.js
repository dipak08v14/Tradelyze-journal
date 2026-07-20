import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        :root {
          --card: #ffffff;
          --accent: #3b82f6;
          --border: #e5e7eb;
          --text-sub: #6b7280;
          --bar: #f9fafb;
        }
        body { font-family: monospace; padding: 50px; }
      </style>
    </head>
    <body>
      <div class="flex items-center overflow-x-auto gap-1 sticky top-0 z-10 font-mono no-scrollbar mt-3 mb-3 px-1 py-1 rounded-lg" style="background-color: var(--bar); border: 0.5px solid var(--border);">
        <button id="strategy-detail-btn" class="px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap rounded" style="background-color: var(--card); color: var(--accent); border: 0.5px solid var(--border); border-radius: 6px;">
          OVERVIEW
        </button>
      </div>
    </body>
    </html>
  `;
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  // Wait for Tailwind to parse classes and inject styles
  await page.waitForFunction(() => {
    const btn = document.querySelector('#strategy-detail-btn');
    const style = window.getComputedStyle(btn);
    // When tailwind applies, padding should be '0.5rem' (8px)
    return style.paddingTop === '8px';
  });
  
  const height = await page.evaluate(() => document.querySelector('#strategy-detail-btn').getBoundingClientRect().height);
  
  console.log('StrategyDetail Tab Button Height:', height, 'px');
  
  await browser.close();
})();
