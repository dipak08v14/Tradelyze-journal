const fs = require('fs');
const content = fs.readFileSync('DashboardPage.tsx', 'utf8');
const lines = content.split('\n');

let out = '';
const seenLines = new Set();

lines.forEach((line, i) => {
  const trimmed = line.trim();
  
  // Look for elements that might be cards, dropdowns, modals, etc.
  // Must have a className or style
  if (!trimmed.includes('className') && !trimmed.includes('style={{')) return;
  
  let hasShadow = false;
  let isFlatCardCandidate = false;
  
  // Check for Tailwind shadows
  if (/\bshadow(?:-[a-z0-9]+)*\b/.test(line)) {
      hasShadow = true;
  }
  // Check for inline shadows
  if (/boxShadow/.test(line)) {
      hasShadow = true;
  }
  
  // Check for flat card candidates
  if (!hasShadow) {
      const hasBg = line.includes('var(--card)') || line.includes('bg-card') || line.includes('bg-[var(--card)]');
      const hasBorder = line.includes('border');
      const hasRounded = line.includes('rounded') || line.includes('borderRadius');
      if (hasBg && hasBorder && hasRounded) {
          isFlatCardCandidate = true;
      }
  }
  
  if (hasShadow || isFlatCardCandidate) {
      if (!seenLines.has(i)) {
          seenLines.add(i);
          out += `\n--- MATCH AT LINE ${i + 1} (${hasShadow ? 'Has Shadow' : 'Flat Candidate'}) ---\n`;
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length - 1, i + 5); // get some lines after to see what's inside
          for (let j = start; j <= end; j++) {
              out += `${j + 1}: ${lines[j]}\n`;
          }
      }
  }
});

fs.writeFileSync('dashboard_exhaustive.txt', out);
