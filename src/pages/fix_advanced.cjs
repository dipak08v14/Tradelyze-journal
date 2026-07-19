const fs = require('fs');
let c = fs.readFileSync('AdvancedReports.tsx', 'utf8');
let lines = c.split('\n');

const standardShadow = "boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)'";
const elevatedShadow = "boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)'";

const group1Lines = [1536, 2061, 2074, 2087, 2101, 2168, 2270, 2385, 2425, 2670, 2678, 2719, 2874, 2882, 2917, 3036, 3089, 3134, 3174, 3334, 3345, 3422, 3551];
let group1Count = 0;

group1Lines.forEach(lineNum => {
    let idx = lineNum - 1; // 0-indexed
    let l = lines[idx];
    
    // Remove shadow-sm
    l = l.replace(/\s*shadow-sm\s*/, ' ');
    
    // Insert standardShadow into style prop
    if (l.includes('style={{')) {
        l = l.replace(/style=\{\{\s*/, `style={{ ${standardShadow}, `);
    } else {
        l = l.replace(/className="/, `style={{ ${standardShadow} }} className="`);
    }
    
    if (l !== lines[idx]) group1Count++;
    lines[idx] = l;
});
console.log('Group 1 applied:', group1Count, '/', group1Lines.length);


// Group 2
let group2Count = 0;

// Line 1681
let l1681 = lines[1681 - 1];
l1681 = l1681.replace(/boxShadow:\s*'0 8px 24px rgba\(0,0,0,0\.15\)'/, elevatedShadow);
if (l1681 !== lines[1681 - 1]) group2Count++;
lines[1681 - 1] = l1681;

// Line 2520
let l2520 = lines[2520 - 1];
// The style prop is actually on line 2521 according to the sweep! Let's check:
// [Line 2520] (Has Shadow): className="p-5 rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300"
// [Line 2521] (Flat Candidate): style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}
l2520 = l2520.replace(/\s*shadow-lg\s*/, ' ');
lines[2520 - 1] = l2520;

let l2521 = lines[2521 - 1];
l2521 = l2521.replace(/style=\{\{\s*/, `style={{ ${elevatedShadow}, `);
lines[2521 - 1] = l2521;
group2Count++;

console.log('Group 2 applied:', group2Count, '/ 2');


// Group 3
const group3Lines = [2772, 2958, 3222, 3476, 3295];
let group3Count = 0;

group3Lines.forEach(lineNum => {
    let idx = lineNum - 1;
    let l = lines[idx];
    
    l = l.replace(/\s*shadow-sm\s*/, ' ');
    
    if (l !== lines[idx]) group3Count++;
    lines[idx] = l;
});

console.log('Group 3 applied:', group3Count, '/', group3Lines.length);

c = lines.join('\n');
fs.writeFileSync('AdvancedReports.tsx', c);

// VERIFICATION
const newC = fs.readFileSync('AdvancedReports.tsx', 'utf8');

console.log('Remaining shadow-sm matches:', (newC.match(/shadow-sm/g) || []).length);
console.log('Remaining shadow-lg matches:', (newC.match(/shadow-lg/g) || []).length);

let dupes = 0;
const newLines = newC.split('\n');
newLines.forEach((l, i) => {
    if (l.match(/style=\{.*style=\{/)) {
        console.log(`Duplicate style prop on line ${i+1}`);
        dupes++;
    }
});
console.log('Duplicate style props:', dupes);
