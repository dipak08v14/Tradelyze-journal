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
    await page.goto('http://localhost:3010/login', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('sb-bcpwbxqlmvnyhhsonzbo-auth-token', token);
    }, tokenData);

    await page.goto('http://localhost:3010/strategies', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));

    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr')).map(tr => {
        // Find links inside this row
        const link = tr.querySelector('a');
        return {
          text: tr.innerText.replace(/\n/g, ' '),
          href: link ? link.getAttribute('href') : null
        };
      });

      const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent.trim(),
        href: a.getAttribute('href')
      }));

      return {
        rows,
        allLinks
      };
    });

    console.log(JSON.stringify(data, null, 2));

    await browser.close();
  } catch (error) {
    console.error(error);
  }
})();
