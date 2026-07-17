const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

// Extract complete JSX tags (handling nested braces and quotes)
function getCompleteTags(content, tagName) {
  const results = [];
  let index = 0;
  const tagStart = `<${tagName}`;
  
  while (true) {
    index = content.indexOf(tagStart, index);
    if (index === -1) break;
    
    // Find the closing '>' of this tag, handling quotes and braces
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let inBraceCount = 0;
    let tagEndIndex = -1;
    
    for (let i = index; i < content.length; i++) {
      const char = content[i];
      if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
      else if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
      else if (char === '{' && !inDoubleQuote && !inSingleQuote) inBraceCount++;
      else if (char === '}' && !inDoubleQuote && !inSingleQuote) inBraceCount--;
      else if (char === '>' && !inDoubleQuote && !inSingleQuote && inBraceCount === 0) {
        tagEndIndex = i;
        break;
      }
    }
    
    if (tagEndIndex !== -1) {
      results.push(content.slice(index, tagEndIndex + 1));
      index = tagEndIndex + 1;
    } else {
      index += tagStart.length;
    }
  }
  return results;
}

const allInputs = [];
const allButtons = [];
const allSelects = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
  getCompleteTags(content, 'input').forEach(tag => allInputs.push({ file, tag }));
  getCompleteTags(content, 'button').forEach(tag => allButtons.push({ file, tag }));
  getCompleteTags(content, 'select').forEach(tag => allSelects.push({ file, tag }));
}

console.log(`Parsed ${allInputs.length} inputs, ${allButtons.length} buttons, ${allSelects.length} selects.\n`);

// Analyze patterns
function analyzeTags(tags, name) {
  const patterns = {};
  tags.forEach(item => {
    // Extract className or style
    const classMatch = item.tag.match(/className=["']([^"']+)["']/);
    const styleMatch = item.tag.match(/style=\{\{([^}]+)\}\}/s);
    
    const key = (classMatch ? `class: ${classMatch[1]}` : '') + (styleMatch ? ` | style: ${styleMatch[1].replace(/\s+/g, ' ').trim()}` : '');
    if (key) {
      patterns[key] = (patterns[key] || 0) + 1;
    } else {
      patterns['un-styled'] = (patterns['un-styled'] || 0) + 1;
    }
  });
  
  console.log(`--- DOMINANT ${name.toUpperCase()} PATTERNS ---`);
  Object.entries(patterns).sort((a,b) => b[1] - a[1]).slice(0, 10).forEach(([pattern, count]) => {
    console.log(`[${count} times] ${pattern}`);
  });
  console.log("\n");
}

analyzeTags(allInputs, 'input');
analyzeTags(allButtons, 'button');
analyzeTags(allSelects, 'select');
