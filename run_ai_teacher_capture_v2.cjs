const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const appPath = path.join(__dirname, 'src', 'App.tsx');
const teacherPath = path.join(__dirname, 'src', 'pages', 'AiTeacherPage.tsx');

// Backups
const appBackup = fs.readFileSync(appPath, 'utf8');
const teacherBackup = fs.readFileSync(teacherPath, 'utf8');

try {
  console.log("Modifying App.tsx and AiTeacherPage.tsx for public route + mock data...");

  // Modify App.tsx: normalize line endings first
  let appContent = appBackup.replace(/\r/g, '');
  
  // Insert public route
  appContent = appContent.replace(
    '<Route path="/login" element={<LoginPage />} />',
    '<Route path="/login" element={<LoginPage />} />\n            <Route path="/ai-teacher" element={<AiTeacherPage />} />'
  );
  
  // Comment out duplicate route inside AuthenticatedLayout
  appContent = appContent.replace(
    '/* Other Authenticated Pages */\n              <Route path="/ai-teacher" element={<AiTeacherPage />} />',
    '/* Other Authenticated Pages */\n              {/* <Route path="/ai-teacher" element={<AiTeacherPage />} /> */}'
  );
  
  fs.writeFileSync(appPath, appContent, 'utf8');
  console.log("App.tsx modified successfully.");

  // Modify AiTeacherPage.tsx
  let teacherContent = teacherBackup.replace(/\r/g, '');

  // Define mock user OUTSIDE the component to avoid re-creation and infinite render loops
  teacherContent = teacherContent.replace(
    "export const AiTeacherPage: React.FC = () => {",
    "const mockUser = { id: 'mock-user-id', email: 'dipak08v14@gmail.com' };\n\nexport const AiTeacherPage: React.FC = () => {"
  );

  // Replace useAuth hook call
  teacherContent = teacherContent.replace(
    "const { user, userId, loading: authLoading } = useAuth();",
    "const user = mockUser; const userId = 'mock-user-id'; const authLoading = false;"
  );

  // Comment out Auth Redirection
  teacherContent = teacherContent.replace(
    /\/\/ Auth Redirection[\s\S]*?navigate\('\/login'\);[\s\S]*?\},\s*\[userId,\s*authLoading,\s*navigate\]\);/g,
    '/* Auth Redirection disabled */'
  );

  // Replace performance contexts fetch hook
  const startKeyword = '// Load General Performance Contexts';
  const endKeyword = '// Load Selected Specific Trade context details';
  const startIndex = teacherContent.indexOf(startKeyword);
  const endIndex = teacherContent.indexOf(endKeyword);

  if (startIndex !== -1 && endIndex !== -1) {
    const before = teacherContent.slice(0, startIndex);
    const after = teacherContent.slice(endIndex);
    
    const mockCodeLines = [
      "// Load General Performance Contexts (mocked)",
      "  useEffect(() => {",
      "    setLoading(true);",
      "    setTrades([",
      "      { id: '1', date: '2026-06-15', symbol: 'NIFTY', direction: 'LONG', pnl: 25000, status: 'Win' },",
      "      { id: '2', date: '2026-06-20', symbol: 'BANKNIFTY', direction: 'SHORT', pnl: -10000, status: 'Loss' }",
      "    ]);",
      "    setLoading(false);",
      "  }, [userId]);",
      "",
      "  "
    ];

    teacherContent = before + mockCodeLines.join("\n") + after;
    console.log("Successfully replaced general performance load hook!");
  } else {
    console.log("Could not locate Load General Performance Contexts hook indices!");
  }

  fs.writeFileSync(teacherPath, teacherContent, 'utf8');

  // Launch Puppeteer and screenshot
  (async () => {
    try {
      console.log("Launching Puppeteer...");
      const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

      page.on('console', msg => console.log('PAGE LOG:', msg.text()));

      await page.goto('http://localhost:3010/ai-teacher', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 6000)); // wait 6 seconds for rendering

      const artDir = 'C:\\Users\\dipak\\.gemini\\antigravity\\brain\\5d143d0c-eb59-44c9-b64a-6361a797107a';
      const screenshotPath = path.join(artDir, 'ai-teacher-mobile-v2.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved screenshot to: ${screenshotPath}`);

      await browser.close();
    } catch (e) {
      console.error("Puppeteer screenshot error:", e);
    } finally {
      restoreFiles();
    }
  })();

} catch (error) {
  console.error("Script setup error:", error);
  restoreFiles();
}

function restoreFiles() {
  console.log("Restoring App.tsx and AiTeacherPage.tsx backups...");
  fs.writeFileSync(appPath, appBackup, 'utf8');
  fs.writeFileSync(teacherPath, teacherBackup, 'utf8');
  console.log("Restoration complete.");
}
