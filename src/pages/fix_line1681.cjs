const fs = require('fs');
let content = fs.readFileSync('AdvancedReports.tsx', 'utf8');
const elevatedShadow = "boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)'";
content = content.replace(/boxShadow:\s*'0 8px 24px rgba\(0,0,0,0\.15\)'/, elevatedShadow);
fs.writeFileSync('AdvancedReports.tsx', content);

// VERIFICATION
console.log('Old shadow matches:', (content.match(/0 8px 24px rgba\(0,0,0,0\.15\)/g) || []).length);
