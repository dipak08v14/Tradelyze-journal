const fs = require('fs');

let c = fs.readFileSync('StrategyBuilderPage.tsx', 'utf8');
let lines = c.split('\n');

const standardShadow = "boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)'";
const elevatedShadow = "boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)'";

// STANDARD FIX (5 identical instances)
const standardTargetLines = [867, 1038, 1137, 1270, 1419];
let replacedCount = 0;

standardTargetLines.forEach(lineNum => {
    let idx = lineNum - 1;
    let l = lines[idx];
    if (l.includes("style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}")) {
        lines[idx] = l.replace(
            "style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}",
            `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px', ${standardShadow} }}`
        );
        replacedCount++;
    } else {
        console.log(`WARNING: Line ${lineNum} did not contain the exact target string.`);
    }
});
console.log(`Replaced exactly ${replacedCount} standard instances at specified lines.`);

// ELEVATED FIX (1 instance)
// Line 1592 (Image Lightbox Modal)
let l1592 = lines[1592 - 1];
lines[1592 - 1] = l1592.replace(/\s*shadow-2xl\s*/, ' ');
// Need to add style prop to line 1592 or next to it. Let's look at it.
// The string was: className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10"
// I will just add the style to the same line if it doesn't have one, or inject it.
if (lines[1592 - 1].includes('className=')) {
    lines[1592 - 1] = lines[1592 - 1].replace('className=', `style={{ ${elevatedShadow} }} className=`);
} else {
    console.log(`WARNING: Line 1592 did not contain className.`);
}

fs.writeFileSync('StrategyBuilderPage.tsx', lines.join('\n'));

// VERIFICATION SCRIPT
const newC = fs.readFileSync('StrategyBuilderPage.tsx', 'utf8');

const targetStr = "style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}";
console.log('Remaining old standard style string matches:', newC.split(targetStr).length - 1);
console.log('Remaining shadow-2xl matches:', (newC.match(/shadow-2xl/g) || []).length);
console.log('Line 1592 contains shadow-2xl:', newC.split('\n')[1592 - 1].includes('shadow-2xl'));

let dupes = 0;
newC.split('\n').forEach((l, i) => {
    // Basic heuristic: two `style={{` on the same line not counting unrelated stuff.
    // We can just check how many times `style={` appears on the line.
    let matches = l.match(/style=\{/g);
    if (matches && matches.length > 1) {
        console.log(`Duplicate style prop on line ${i+1}:`, l.trim());
        dupes++;
    }
});
console.log('Duplicate style props:', dupes);
