const fs = require('fs');

const standardShadow = "boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)'";
const elevatedShadow = "boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)'";

let c = fs.readFileSync('TradeTrackingPage.tsx', 'utf8');

// ELEVATED FIXES (8 instances)
const oldElevatedRegex = /boxShadow:\s*['"]0 4px 6px -1px rgba\(0,\s*0,\s*0,\s*0\.1\),\s*0 2px 4px -1px rgba\(0,\s*0,\s*0,\s*0\.06\)['"]/g;

let elevatedMatches = (c.match(oldElevatedRegex) || []).length;
console.log('Elevated matches found:', elevatedMatches);

c = c.replace(oldElevatedRegex, elevatedShadow);

// STANDARD FIXES
// Lines 73 & 1275
const oldCard73 = `className="p-6 rounded-2xl max-w-md w-full text-center shadow-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}`;
const newCard73 = `className="p-6 rounded-2xl max-w-md w-full text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', ${standardShadow} }}`;

let card73Matches = c.split(oldCard73).length - 1;
console.log('Empty state matches found:', card73Matches);

c = c.split(oldCard73).join(newCard73);

// Line 2534
const oldCard2534 = `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="rounded-xl p-6 shadow-sm"`;
const newCard2534 = `style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', ${standardShadow} }} className="rounded-xl p-6"`;

let card2534Matches = c.split(oldCard2534).length - 1;
console.log('Trade Attachments matches found:', card2534Matches);

if (card2534Matches === 0) {
    // Maybe the order is different? Let's check with regex
    console.log('Trying fallback for 2534...');
    c = c.replace(
        /style=\{\{ backgroundColor: 'var\(--card\)', border: '0\.5px solid var\(--border\)', borderRadius: '12px' \}\}\s*className="rounded-xl p-6 shadow-sm"/,
        newCard2534
    );
    // Alternatively, if className is first
    c = c.replace(
        /className="rounded-xl p-6 shadow-sm"\s*style=\{\{ backgroundColor: 'var\(--card\)', border: '0\.5px solid var\(--border\)', borderRadius: '12px' \}\}/,
        `className="rounded-xl p-6" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', ${standardShadow} }}`
    );
} else {
    c = c.split(oldCard2534).join(newCard2534);
}


fs.writeFileSync('TradeTrackingPage.tsx', c);

// VERIFICATION
const newC = fs.readFileSync('TradeTrackingPage.tsx', 'utf8');

console.log('Remaining old elevated matches:', (newC.match(oldElevatedRegex) || []).length);
console.log('Remaining shadow-2xl matches:', (newC.match(/shadow-2xl/g) || []).length);
console.log('Remaining shadow-sm matches (should only be lines not touched by fix):', (newC.match(/shadow-sm/g) || []).length);

let dupes = 0;
const lines = newC.split('\n');
lines.forEach((l, i) => {
    if (l.match(/style=\{.*style=\{/)) {
        // Exclude the false positive from standard nested inline styles we know about
        if (!l.includes('color: \'var(--text-sub)\'') && !l.includes('color: \'var(--text)\'')) {
           console.log(`Duplicate style prop on line ${i+1}`);
           dupes++;
        }
    }
});
console.log('Duplicate style props:', dupes);

