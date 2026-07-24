const fs = require('fs');
const file = 'src/pages/RiskCalculatorPage.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("borderRadius: '16px',", "borderRadius: '12px',");
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed radius!');
