const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

const buttonStyles = [];
const inputStyles = [];
const selectStyles = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
  
  // Find tags by matching from <button to > or <input to > or <select to >
  // Handing multiline with [^]*?
  const buttons = content.match(/<button[^>]*?>/gi) || [];
  const inputs = content.match(/<input[^>]*?>/gi) || [];
  const selects = content.match(/<select[^>]*?>/gi) || [];
  
  buttons.forEach(tag => {
    buttonStyles.push({ file, tag: tag.replace(/\s+/g, ' ') });
  });
  inputs.forEach(tag => {
    inputStyles.push({ file, tag: tag.replace(/\s+/g, ' ') });
  });
  selects.forEach(tag => {
    selectStyles.push({ file, tag: tag.replace(/\s+/g, ' ') });
  });
}

console.log(`Total Buttons: ${buttonStyles.length}`);
console.log(`Total Inputs: ${inputStyles.length}`);
console.log(`Total Selects: ${selectStyles.length}`);

// Count styling properties
let inlineStyles = 0;
let classNameStyles = 0;
let inlinePaddingCount = 0;
let classPaddingCount = 0;

buttonStyles.concat(inputStyles).concat(selectStyles).forEach(item => {
  if (item.tag.includes('style=')) inlineStyles++;
  if (item.tag.includes('className=')) classNameStyles++;
  
  if (item.tag.includes('style=')) {
    const styleMatch = item.tag.match(/style=\{\{([^}]+)\}\}/);
    if (styleMatch && (styleMatch[1].includes('padding') || styleMatch[1].includes('height'))) {
      inlinePaddingCount++;
    }
  }
  
  if (item.tag.includes('className=')) {
    const classMatch = item.tag.match(/className=["']([^"']+)["']/);
    if (classMatch && (classMatch[1].match(/\bp[xy]?-\d/) || classMatch[1].match(/\bh-\d/))) {
      classPaddingCount++;
    }
  }
});

console.log(`\nInline styles count: ${inlineStyles}`);
console.log(`ClassName styles count: ${classNameStyles}`);
console.log(`Inline padding/height rules: ${inlinePaddingCount}`);
console.log(`Class padding/height rules: ${classPaddingCount}`);

// Let's print 10 samples of inputs
console.log("\nSAMPLE INPUTS:");
inputStyles.slice(0, 10).forEach(i => console.log(`- ${i.file}: ${i.tag}`));

// Let's print 10 samples of buttons
console.log("\nSAMPLE BUTTONS:");
buttonStyles.slice(0, 10).forEach(b => console.log(`- ${b.file}: ${b.tag}`));
