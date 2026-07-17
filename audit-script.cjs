const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const pagesDir = path.join(srcDir, 'pages');
const componentsDir = path.join(srcDir, 'components');

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
}

walk(pagesDir);
walk(componentsDir);

const results = {
  hardcoded: [],
  grids: [],
  overflow: [],
  maxWidth: [],
  fixed: []
};

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(__dirname, file);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 1. HARDCODED WIDTHS/HEIGHTS
    if (/(?:w-\[[3-9][0-9]{2}px\]|w-\[[1-9][0-9]{3,}px\]|h-\[[3-9][0-9]{2}px\]|h-\[[1-9][0-9]{3,}px\]|style=\s*\{\{\s*(?:width|height)\s*:\s*['"][3-9][0-9]{2}px['"])/.test(line)) {
      if (!relPath.includes('Sidebar') && !relPath.includes('TradeChart')) {
          results.hardcoded.push({ file: relPath, line: i + 1, code: line.trim() });
      }
    }
    
    // 2. GRIDS
    // Let's capture the full className if it contains grid-cols
    const gridMatch = line.match(/(?:className=|class=)(?:\{`|["'])([^"'\}`]+)/);
    if (gridMatch) {
      const cls = gridMatch[1];
      if (cls.includes('grid-cols-')) {
         results.grids.push({ file: relPath, line: i + 1, code: line.trim(), className: cls });
      }
    } else if (line.includes('grid-cols-')) {
        results.grids.push({ file: relPath, line: i + 1, code: line.trim(), className: 'found in line' });
    }

    // 3. OVERFLOW HANDLING
    if (line.includes('overflow-x-hidden') || line.includes('overflow-x: hidden') || line.includes('overflowX: "hidden"') || line.includes("overflowX: 'hidden'")) {
      results.overflow.push({ file: relPath, line: i + 1, code: line.trim(), type: 'hidden' });
    }
    if (line.includes('<table') || line.includes('<Table')) {
      results.overflow.push({ file: relPath, line: i + 1, code: line.trim(), type: 'table' });
    }

    // 4. REMAINING max-w-
    if (/(?:max-w-(?:4xl|5xl|6xl|7xl|screen-xl|screen-2xl)|max-w-\[[^\]]+\])/.test(line)) {
      results.maxWidth.push({ file: relPath, line: i + 1, code: line.trim() });
    }

    // 5. FIXED-POSITION ELEMENTS
    if (/\bfixed\b/.test(line) || /position:\s*['"]fixed['"]/.test(line)) {
        if (!relPath.includes('Sidebar')) {
          results.fixed.push({ file: relPath, line: i + 1, code: line.trim() });
        }
    }
  }
}

fs.writeFileSync('audit-results.json', JSON.stringify(results, null, 2));
