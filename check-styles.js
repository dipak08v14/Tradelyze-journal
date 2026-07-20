import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const html = `
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="file://${path.resolve('dist/assets/index-Td7busoO.css')}">
  <style>
    :root {
      --text: #ffffff;
      --text-muted: #a1a1aa;
      --border: #27272a;
      --card: #18181b;
      --bg: #09090b;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
    }
  </style>
</head>
<body>
  <!-- AdvancedReports.tsx structure -->
  <div id="advanced-reports" class="text-sm">
    <div id="target-wins-parent" class="grid grid-cols-[2fr_3fr_2fr] py-2 items-center" style="border-bottom: 1px solid var(--border)">
      <div id="target-wins" class="font-sans whitespace-nowrap" style="color: #008F67">104</div>
    </div>
  </div>

  <!-- TradingLogsPage.tsx structure -->
  <div class="min-h-dvh w-full flex flex-col lg:flex-row lg:items-start font-sans selection:bg-[var(--accent-muted)]" style="background-color: var(--bg); color: var(--text)">
    <div class="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-dvh">
      <table>
        <tbody>
          <tr id="target-pnl-parent" class="border-b border-[var(--border)] bg-transparent hover:bg-zinc-800/10 dark:hover:bg-zinc-100/10 transition-colors text-xs font-sans group">
            <td id="target-pnl-td" class="py-2 px-4 whitespace-nowrap">
              <span id="target-pnl" style="color: #008F67; font-weight: 600" class="text-sm">
                ₹104.00
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
`;

fs.writeFileSync('test-computed.html', html);

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('file://' + path.resolve('test-computed.html'), { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));
  
  const extractStyles = await page.evaluate(() => {
    const propsToRead = [
      'font-size', 'font-weight', 'font-family', 'letter-spacing', 'line-height', 
      '-webkit-font-smoothing', 'text-rendering', 'color', 'opacity', 'transform', 'filter'
    ];
    
    const getStyles = (id) => {
      const el = document.getElementById(id);
      const comp = window.getComputedStyle(el);
      const res = {};
      propsToRead.forEach(p => res[p] = comp.getPropertyValue(p));
      return res;
    };
    
    return {
      wins: getStyles('target-wins'),
      pnl: getStyles('target-pnl'),
      winsParent: getStyles('target-wins-parent'),
      pnlParent: getStyles('target-pnl-parent'),
      pnlTd: getStyles('target-pnl-td')
    };
  });
  
  console.log('--- WINS Parent ---');
  console.log(extractStyles.winsParent);
  console.log('\n--- PNL Parent (TR) ---');
  console.log(extractStyles.pnlParent);
  console.log('\n--- PNL Parent (TD) ---');
  console.log(extractStyles.pnlTd);

  await browser.close();
})();
