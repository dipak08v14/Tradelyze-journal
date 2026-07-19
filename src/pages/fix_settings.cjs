const fs = require('fs');
let content = fs.readFileSync('SettingsPage.tsx', 'utf8');

const standardShadow = "style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)' }}";
const elevatedShadow = "style={{ boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)' }}";

// Count before
const beforeCount1 = content.split('className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md"').length - 1;
const beforeCount2 = content.split('className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md space-y-6 animate-fade-in animate-none"').length - 1;

console.log('Instances of Target 1 found: ' + beforeCount1);
console.log('Instances of Target 6/7 found: ' + beforeCount2);

// 1-4
content = content.split('className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md"')
                 .join(`className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6" ${standardShadow}`);

// 5
content = content.replace(
  'className="space-y-6 animate-fade-in bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md"',
  `className="space-y-6 animate-fade-in bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6" ${standardShadow}`
);

// 6 & 7
content = content.split('className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md space-y-6 animate-fade-in animate-none"')
                 .join(`className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-6 animate-fade-in animate-none" ${standardShadow}`);

// 8
content = content.replace(
  'className="bg-[var(--card)] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative"',
  `className="bg-[var(--card)] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 relative" ${elevatedShadow}`
);

// 9
content = content.replace(
  'className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto"',
  `className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-2xl w-full p-6 space-y-4 relative animate-fade-in max-h-[90vh] overflow-y-auto" ${elevatedShadow}`
);

// 10
content = content.replace(
  'className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-fade-in"',
  `className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 space-y-5 relative animate-fade-in" ${elevatedShadow}`
);

fs.writeFileSync('SettingsPage.tsx', content);

// VERIFICATION
const newContent = fs.readFileSync('SettingsPage.tsx', 'utf8');
const lines = newContent.split('\n');

let shadowMdCount = 0;
let shadow2xlCount = 0;
let shadowCount = 0;

lines.forEach((l, i) => {
    if (l.includes('shadow-md')) {
        console.log(`[Line ${i+1}] Found shadow-md: ${l.trim()}`);
        shadowMdCount++;
    }
    if (l.includes('shadow-2xl')) {
        console.log(`[Line ${i+1}] Found shadow-2xl: ${l.trim()}`);
        shadow2xlCount++;
    }
    // match \bshadow\b but NOT shadow-md or others
    const words = l.split(/[^a-zA-Z0-9_-]/);
    if (words.includes('shadow')) {
        console.log(`[Line ${i+1}] Found plain shadow: ${l.trim()}`);
        shadowCount++;
    }
});

console.log('--- Summary ---');
console.log('shadow-md count: ' + shadowMdCount);
console.log('shadow-2xl count: ' + shadow2xlCount);
console.log('plain shadow count: ' + shadowCount);
