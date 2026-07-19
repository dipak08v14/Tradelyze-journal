const fs = require('fs');

const elevatedShadow = "boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)'";
const file = 'Notebook.tsx';
let c = fs.readFileSync(file, 'utf8');

// Line 1132
const oldDrawer = `className={\`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[400px] flex flex-col overflow-y-auto shadow-2xl transition-transform duration-250 ease-in-out \${`;
const newDrawer = `className={\`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[400px] flex flex-col overflow-y-auto transition-transform duration-250 ease-in-out \${`;
c = c.replace(oldDrawer, newDrawer);

const oldDrawerHeader = `style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}`;
const newDrawerHeader = `style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', ${elevatedShadow} }}`;
// Only replace the FIRST occurrence in the drawer context, or just replace the one matching drawerHeader.
// Let's replace the one that comes immediately after notebookDrawerOpen...
c = c.replace(
    /<div\s+style=\{\{\s*borderColor: 'var\(--border\)', backgroundColor: 'var\(--card\)'\s*\}\}\s+className="px-4 py-3 flex items-center justify-between border-b"/,
    `<div\n            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}\n            className="px-4 py-3 flex items-center justify-between border-b"`
);
// Wait, the Drawer itself is the container at line 1132. Does it have a style prop?
// Let's check Notebook.tsx line 1132 using regex.
const drawerContainerRegex = /<div\s+className=\{\`fixed inset-y-0 left-0 z-50 w-\[85vw\] max-w-\[400px\] flex flex-col overflow-y-auto shadow-2xl transition-transform duration-250 ease-in-out \$\{([\s\S]*?)\}\`\}/;
c = c.replace(drawerContainerRegex, (match, p1) => {
    return `<div\n          style={{ ${elevatedShadow} }}\n          className={\`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[400px] flex flex-col overflow-y-auto transition-transform duration-250 ease-in-out \${${p1}}\`}`;
});

// If that failed because it already had a style, let's just do an exact match replace since I have the code context.
c = fs.readFileSync(file, 'utf8');

c = c.replace(
    /className=\{\`fixed inset-y-0 left-0 z-50 w-\[85vw\] max-w-\[400px\] flex flex-col overflow-y-auto shadow-2xl transition-transform duration-250 ease-in-out \$\{/g,
    `style={{ ${elevatedShadow} }}\n          className={\`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[400px] flex flex-col overflow-y-auto transition-transform duration-250 ease-in-out \${`
);

// Line 1258
c = c.replace(
    /className="absolute top-5 right-0 mt-1 w-28 bg-\[var\(--card\)\] rounded-lg shadow-xl border border-\[var\(--border\)\] p-1 z-30 font-sans flex flex-col gap-0\.5"/,
    `className="absolute top-5 right-0 mt-1 w-28 bg-[var(--card)] rounded-lg border border-[var(--border)] p-1 z-30 font-sans flex flex-col gap-0.5" style={{ ${elevatedShadow} }}`
);


// Line 1918
c = c.replace(
    /className="w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden p-6 animate-in scale-in duration-200"\s*style=\{\{ backgroundColor: 'var\(--card\)', borderColor: 'var\(--border\)' \}\}/,
    `className="w-full max-w-sm rounded-2xl border overflow-hidden p-6 animate-in scale-in duration-200"\n            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', ${elevatedShadow} }}`
);

// Line 1994
c = c.replace(
    /className="w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden p-6 animate-in scale-in duration-200"\s*style=\{\{ backgroundColor: 'var\(--card\)', borderColor: 'var\(--border\)' \}\}/,
    `className="w-full max-w-sm rounded-2xl border overflow-hidden p-6 animate-in scale-in duration-200"\n            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', ${elevatedShadow} }}`
);

// Line 2047
c = c.replace(
    /className="w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden p-6 animate-in scale-in duration-200 border-amber-500\/30"\s*style=\{\{ backgroundColor: 'var\(--card\)', borderColor: 'rgba\(245, 158, 11, 0\.3\)' \}\}/,
    `className="w-full max-w-sm rounded-2xl border overflow-hidden p-6 animate-in scale-in duration-200 border-amber-500/30"\n            style={{ backgroundColor: 'var(--card)', borderColor: 'rgba(245, 158, 11, 0.3)', ${elevatedShadow} }}`
);

// Line 2086
c = c.replace(
    /className="w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden p-6 animate-in scale-in duration-200"\s*style=\{\{ backgroundColor: 'var\(--card\)', borderColor: 'var\(--border\)' \}\}/,
    `className="w-full max-w-sm rounded-2xl border overflow-hidden p-6 animate-in scale-in duration-200"\n            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', ${elevatedShadow} }}`
);

// Check if any shadow-xl is left in modals just in case regex was slightly off
let remainingShadowXl = (c.match(/shadow-xl/g) || []).length;
if (remainingShadowXl > 0) {
    console.log(`Failed to replace all shadow-xl! Remaining: ${remainingShadowXl}`);
    // If it failed due to style ordering, let's try the reverse
    c = c.replace(
        /style=\{\{ backgroundColor: 'var\(--card\)', borderColor: 'var\(--border\)' \}\}\s*className="w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden p-6 animate-in scale-in duration-200"/g,
        `style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', ${elevatedShadow} }}\n            className="w-full max-w-sm rounded-2xl border overflow-hidden p-6 animate-in scale-in duration-200"`
    );
    c = c.replace(
        /style=\{\{ backgroundColor: 'var\(--card\)', borderColor: 'rgba\(245, 158, 11, 0\.3\)' \}\}\s*className="w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden p-6 animate-in scale-in duration-200 border-amber-500\/30"/g,
        `style={{ backgroundColor: 'var(--card)', borderColor: 'rgba(245, 158, 11, 0.3)', ${elevatedShadow} }}\n            className="w-full max-w-sm rounded-2xl border overflow-hidden p-6 animate-in scale-in duration-200 border-amber-500/30"`
    );
}


// Line 1433
c = c.replace(
    /className="px-4 py-2 bg-\[var\(--bar\)\]\/20 shadow-sm flex items-center justify-between select-none border-b border-\[var\(--border\)\]\/40 shrink-0"/g,
    `className="px-4 py-2 bg-[var(--bar)]/20 flex items-center justify-between select-none border-b border-[var(--border)]/40 shrink-0"`
);


fs.writeFileSync(file, c);

const verifyC = fs.readFileSync(file, 'utf8');
console.log('shadow-2xl count:', (verifyC.match(/shadow-2xl/g) || []).length);
console.log('shadow-xl count:', (verifyC.match(/shadow-xl/g) || []).length);
console.log('shadow-sm count on line 1433:', (verifyC.match(/bg-\[var\(--bar\)\]\/20 shadow-sm/g) || []).length);

let dupes = 0;
const lines = verifyC.split('\n');
lines.forEach((l, i) => {
    if (l.match(/style=\{.*style=\{/)) {
        console.log(`Duplicate style prop on line ${i+1}`);
        dupes++;
    }
});
console.log('Duplicate style props:', dupes);
