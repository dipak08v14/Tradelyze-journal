const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'lib', 'supabase.ts'), 'utf8');
console.log(content);
