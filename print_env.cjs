const fs = require('fs');
const path = require('path');
try {
  const content = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  console.log(content);
} catch (e) {
  console.log("No .env file found");
}
