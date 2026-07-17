const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx'), 'utf-8');

console.log("Checks for search params / url parsing:");
const matches = content.match(/searchParams|useSearchParams|URLSearchParams|location\.search/g);
console.log("Matches found:", matches);

// Let's print occurrences of 'date' or 'range' near search parameters if any
if (content.includes('useSearchParams')) {
  console.log("Contains useSearchParams. Printing lines...");
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('useSearchParams') || l.includes('searchParams')) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  });
} else {
  // Let's search for how date range is initialized
  console.log("No search params found. Let's find state initialization of fromDate/toDate or dateRange");
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.match(/const\s+\[\s*(?:dateRange|fromDate|toDate|range)/i)) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  });
}
