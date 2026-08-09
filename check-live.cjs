const https = require('https');
https.get('https://tradelyze-journal.vercel.app', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Look for script tags
    const scriptRegex = /<script type="module" crossorigin src="(\/assets\/index-[^"]+\.js)"><\/script>/;
    const match = data.match(scriptRegex);
    if (match) {
      console.log('Found main bundle:', match[1]);
      https.get('https://tradelyze-journal.vercel.app' + match[1], (jsRes) => {
        let jsData = '';
        jsRes.on('data', chunk => jsData += chunk);
        jsRes.on('end', () => {
          if (jsData.includes('convertTradeAmounts')) {
            console.log('LIVE SITE CONTAINS convertTradeAmounts!');
          } else {
            console.log('LIVE SITE DOES NOT CONTAIN convertTradeAmounts. It is running older code.');
          }
        });
      });
    } else {
      console.log('Could not find main JS bundle');
    }
  });
});
