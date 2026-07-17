const fs = require('fs');
const path = require('path');
const libDir = path.join(__dirname, 'src', 'lib');
console.log(fs.readdirSync(libDir));
