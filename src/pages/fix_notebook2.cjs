const fs = require('fs');
let c = fs.readFileSync('Notebook.tsx', 'utf8');

const elevatedShadow = "boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)'";

c = c.replace(
    /className="w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden p-6 animate-in scale-in duration-200 border-amber-500\/30"\s*style=\{\{ backgroundColor: 'var\(--card\)' \}\}/,
    `className="w-full max-w-sm rounded-2xl border overflow-hidden p-6 animate-in scale-in duration-200 border-amber-500/30"\n            style={{ backgroundColor: 'var(--card)', ${elevatedShadow} }}`
);

fs.writeFileSync('Notebook.tsx', c);

const verifyC = fs.readFileSync('Notebook.tsx', 'utf8');
console.log('shadow-xl count:', (verifyC.match(/shadow-xl/g) || []).length);
