const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const excluded = ['LandingPage.tsx', 'PricingPage.tsx', 'LoginPage.tsx', 'SignupPage.tsx', 'OnboardingPage.tsx'];

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') && !excluded.includes(f));

const results = [];

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // We'll look for 'md:flex-row' combined with 'flex-col' which is typically the outermost wrapper.
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('className=') && line.includes('md:flex-row') && line.includes('flex-col')) {
      const match = line.match(/className=(?:\{`|["'])([^"'\}`]+)/);
      if (match) {
        results.push({
          file: file,
          line: i + 1,
          className: match[1]
        });
        found = true;
        break; // Only need the outermost one
      }
    }
  }
  
  // If not found with the specific criteria, just look for md:flex-row
  if (!found) {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('className=') && line.includes('md:flex-row')) {
            const match = line.match(/className=(?:\{`|["'])([^"'\}`]+)/);
            if (match) {
                results.push({
                  file: file,
                  line: i + 1,
                  className: match[1]
                });
                found = true;
                break;
            }
        }
    }
  }
}

fs.writeFileSync('outermost-wrappers.json', JSON.stringify(results, null, 2));
