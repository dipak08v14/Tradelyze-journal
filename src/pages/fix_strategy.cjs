const fs = require('fs');

let c = fs.readFileSync('StrategyDetail.tsx', 'utf8');
let lines = c.split('\n');

const standardShadow = "boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)'";
const elevatedShadow = "boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)'";

// Group 1 — ELEVATED FIXES
// Line 1267 (floating modal container): remove "shadow-2xl", add ELEVATED boxShadow to style
let l1267 = lines[1267 - 1];
l1267 = l1267.replace(/\s*shadow-2xl\s*/, ' ');
lines[1267 - 1] = l1267;
let l1268 = lines[1268 - 1]; // This is where the style prop actually is (confirmed from sweep)
l1268 = l1268.replace(/style=\{\{\s*/, `style={{ ${elevatedShadow}, `);
lines[1268 - 1] = l1268;

// Line 1323 (dropdown menu): remove "shadow-xl", add ELEVATED boxShadow to style
let l1323 = lines[1323 - 1];
l1323 = l1323.replace(/\s*shadow-xl\s*/, ' ');
lines[1323 - 1] = l1323;
let l1324 = lines[1324 - 1]; // Style prop is on the next line
l1324 = l1324.replace(/style=\{\{\s*/, `style={{ ${elevatedShadow}, `);
lines[1324 - 1] = l1324;


// Group 2 — FLAT FIXES
// Line 634 (Strategy Type Badge): remove "shadow-sm"
let l634 = lines[634 - 1];
lines[634 - 1] = l634.replace(/\s*shadow-sm\s*/, ' ');

// Line 1520 (Image Thumbnail Wrapper): remove "shadow-sm"
let l1520 = lines[1520 - 1];
lines[1520 - 1] = l1520.replace(/\s*shadow-sm\s*/, ' ');


// Group 3 — STANDARD FIXES
// Lines 722, 730, 738, 755, 763, 771, 779, 787, 796 (Overview Stats KPI cards)
// Lines 1146, 1151, 1158 (Missed Trades KPI cards)
// Line 1445 (Standard Content Card)
const g3OneLiners = [722, 730, 738, 755, 763, 771, 779, 787, 796, 1146, 1151, 1158, 1445];
g3OneLiners.forEach(lineNum => {
    let idx = lineNum - 1;
    let l = lines[idx];
    if (l.includes('style={{')) {
        lines[idx] = l.replace(/style=\{\{\s*/, `style={{ ${standardShadow}, `);
    } else {
        lines[idx] = l.replace(/className="/, `style={{ ${standardShadow} }} className="`);
    }
});

// Line 1491 (Empty State Container): multiline
let l1491 = lines[1491 - 1]; // "className=..."
let l1492 = lines[1492 - 1]; // "style={{ ... }}"
l1492 = l1492.replace(/style=\{\{\s*/, `style={{ ${standardShadow}, `);
lines[1492 - 1] = l1492;

fs.writeFileSync('StrategyDetail.tsx', lines.join('\n'));

// VERIFICATION SCRIPT
const newC = fs.readFileSync('StrategyDetail.tsx', 'utf8');

console.log('Remaining shadow-2xl matches:', (newC.match(/shadow-2xl/g) || []).length);
console.log('Remaining shadow-xl matches:', (newC.match(/shadow-xl/g) || []).length);
console.log('Line 634 shadow-sm:', newC.split('\n')[634 - 1].includes('shadow-sm'));
console.log('Line 1520 shadow-sm:', newC.split('\n')[1520 - 1].includes('shadow-sm'));

let dupes = 0;
newC.split('\n').forEach((l, i) => {
    if (l.match(/style=\{.*style=\{/)) {
        console.log(`Duplicate style prop on line ${i+1}`);
        dupes++;
    }
});
console.log('Duplicate style props:', dupes);
