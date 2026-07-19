const fs = require('fs');

const builder = fs.readFileSync('src/pages/StrategyBuilderPage.tsx', 'utf8');
console.log('--- useState in StrategyBuilderPage.tsx ---');
builder.split('\n').forEach((line, i) => {
  if (line.includes('useState')) {
    console.log((i+1) + ': ' + line.trim());
  }
});

console.log('\n--- Searching for unsaved / dirty logic across src ---');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const allFiles = walk('src');
allFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let found = false;
  content.split('\n').forEach((l, i) => {
    if (l.match(/isDirty|unsaved|UnsavedChangesModal|beforeUnload|prompt|ConfirmLeave|hasUnsavedChanges/i)) {
      if (!found) {
        console.log('\n' + f.replace(path.resolve('src') + '\\', ''));
        found = true;
      }
      console.log('  ' + (i+1) + ': ' + l.trim());
    }
  });
});
