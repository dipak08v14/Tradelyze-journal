const fs = require('fs');
const file = 'src/pages/SettingsPage.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('border rounded-lg py-3 px-5 hover:opacity-95', 'border rounded-xl py-3 px-5 hover:opacity-95');
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed line 1980/1986');
