const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

const results = {
  layouts: [],
  tables: [],
  touchTargets: []
};

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let inTable = false;
  
  lines.forEach((line, i) => {
    const lineNum = i + 1;
    
    // Check grids (mobile-first means 'grid-cols-X' applies to mobile)
    // We look for unprefixed grid-cols-2 to grid-cols-12
    if (/(?<![:a-zA-Z0-9\-])grid-cols-[2-9]/.test(line) || /(?<![:a-zA-Z0-9\-])grid-cols-1[0-2]/.test(line)) {
      results.layouts.push({ file, lineNum, type: 'grid', code: line.trim() });
    }
    
    // Check flex-row without flex-col
    // If it has flex-row but not flex-col anywhere in the line
    if (line.includes('flex-row') && !line.includes('flex-col')) {
      results.layouts.push({ file, lineNum, type: 'flex-row', code: line.trim() });
    }

    // Check for tables
    if (line.includes('<Table') || line.includes('<table')) {
      inTable = true;
      results.tables.push({ file, lineNum, type: 'table-start', code: line.trim() });
    }
    if (inTable && (line.includes('</Table>') || line.includes('</table>'))) {
      inTable = false;
    }
    
    // Check table headers for hidden classes
    if (inTable && (line.includes('<th') || line.includes('<TableHead'))) {
      if (line.includes('hidden') || line.includes('sm:table-cell') || line.includes('md:hidden')) {
        results.tables.push({ file, lineNum, type: 'table-header-hidden', code: line.trim() });
      } else {
        results.tables.push({ file, lineNum, type: 'table-header', code: line.trim() });
      }
    }

    // Check buttons/inputs for padding
    if (line.match(/<Button|<button|<input|<select/) && line.includes('className')) {
      results.touchTargets.push({ file, lineNum, code: line.trim() });
    }
  });
}

fs.writeFileSync('audit_results.json', JSON.stringify(results, null, 2));
console.log("Audit complete. Results saved to audit_results.json");
