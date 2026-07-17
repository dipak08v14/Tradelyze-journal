const fs = require('fs');
const path = require('path');

function searchFile(dir, fileName) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        const res = searchFile(fullPath, fileName);
        if (res) return res;
      }
    } else if (file === fileName) {
      return fullPath;
    }
  }
  return null;
}

const projRoot = path.join(__dirname);
const supabasePath = searchFile(projRoot, 'supabase.js') || searchFile(projRoot, 'supabaseClient.js') || searchFile(projRoot, 'supabase.ts') || searchFile(projRoot, 'supabaseClient.ts');
console.log(`Supabase file path: ${supabasePath}`);

if (supabasePath) {
  const content = fs.readFileSync(supabasePath, 'utf8');
  console.log("Supabase config content:");
  console.log(content);
}
