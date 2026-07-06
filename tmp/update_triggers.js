const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'pages', 'TradeTrackingPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target1 = `                                 onKeyDown={handleExecStatusKeyDown}\r\n                                 style={{\r\n                                   border: '0.5px solid var(--border)',\r\n                                   borderRadius: '6px',\r\n                                   backgroundColor: 'var(--card)',\r\n                                   color: 'var(--text)',\r\n                                   padding: '4px 8px',\r\n                                   width: '50%'\r\n                                 }}\r\n                                 className="flex items-center justify-between gap-1.5 text-xs hover:border-[var(--accent)] transition-all cursor-pointer focus:outline-none focus:border-[var(--accent)] whitespace-nowrap overflow-hidden"`;

const target1_lf = target1.replace(/\r\n/g, '\n');

const replacement1 = `                                 onKeyDown={handleExecStatusKeyDown}\n                                 style={{\n                                   border: '0.5px solid var(--border)',\n                                   borderRadius: '6px',\n                                   backgroundColor: 'var(--card)',\n                                   color: 'var(--text)',\n                                   padding: '4px 8px',\n                                   width: '50%',\n                                   fontSize: '13px',\n                                   minHeight: '29px'\n                                 }}\n                                 className="flex items-center justify-between gap-1.5 hover:border-[var(--accent)] transition-all cursor-pointer focus:outline-none focus:border-[var(--accent)] whitespace-nowrap overflow-hidden"`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1.replace(/\n/g, '\r\n'));
  console.log('Replaced target1 with CRLF');
} else if (content.includes(target1_lf)) {
  content = content.replace(target1_lf, replacement1);
  console.log('Replaced target1 with LF');
} else {
  console.log('target1 not found directly');
}

const target2 = `                                 onKeyDown={handleMistakeTypeKeyDown}\r\n                                 style={{\r\n                                   border: '0.5px solid var(--border)',\r\n                                   borderRadius: '6px',\r\n                                   backgroundColor: 'var(--card)',\r\n                                   color: 'var(--text)',\r\n                                   padding: '4px 8px',\r\n                                   width: '50%'\r\n                                 }}\r\n                                 className="flex items-center justify-between gap-1.5 text-xs hover:border-[var(--accent)] transition-all cursor-pointer focus:outline-none focus:border-[var(--accent)] whitespace-nowrap overflow-hidden"`;

const target2_lf = target2.replace(/\r\n/g, '\n');

const replacement2 = `                                 onKeyDown={handleMistakeTypeKeyDown}\n                                 style={{\n                                   border: '0.5px solid var(--border)',\n                                   borderRadius: '6px',\n                                   backgroundColor: 'var(--card)',\n                                   color: 'var(--text)',\n                                   padding: '4px 8px',\n                                   width: '50%',\n                                   fontSize: '13px',\n                                   minHeight: '29px'\n                                 }}\n                                 className="flex items-center justify-between gap-1.5 hover:border-[var(--accent)] transition-all cursor-pointer focus:outline-none focus:border-[var(--accent)] whitespace-nowrap overflow-hidden"`;

if (content.includes(target2)) {
  content = content.replace(target2, replacement2.replace(/\n/g, '\r\n'));
  console.log('Replaced target2 with CRLF');
} else if (content.includes(target2_lf)) {
  content = content.replace(target2_lf, replacement2);
  console.log('Replaced target2 with LF');
} else {
  console.log('target2 not found directly');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated file.');
