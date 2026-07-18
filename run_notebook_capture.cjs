const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const appPath = path.join(__dirname, 'src', 'App.tsx');
const notebookPath = path.join(__dirname, 'src', 'pages', 'Notebook.tsx');

// Backups
const appBackup = fs.readFileSync(appPath, 'utf8');
const notebookBackup = fs.readFileSync(notebookPath, 'utf8');

try {
  console.log("Modifying App.tsx and Notebook.tsx for public route + mock data...");

  // Modify App.tsx: normalize to LF first
  let appContent = appBackup.replace(/\r/g, '');
  
  // Insert public route
  appContent = appContent.replace(
    '<Route path="/login" element={<LoginPage />} />',
    '<Route path="/login" element={<LoginPage />} />\n            <Route path="/notebook" element={<Notebook />} />'
  );
  
  // Comment out duplicate route inside AuthenticatedLayout specifically
  appContent = appContent.replace(
    '/* Other Authenticated Pages */\n              <Route path="/notebook" element={<Notebook />} />',
    '/* Other Authenticated Pages */\n              {/* <Route path="/notebook" element={<Notebook />} /> */}'
  );
  
  fs.writeFileSync(appPath, appContent, 'utf8');
  console.log("App.tsx modified successfully.");

  // Modify Notebook.tsx (strip \r for uniform match)
  let notebookContent = notebookBackup.replace(/\r/g, '');

  // Define mock user OUTSIDE the component to prevent re-creation and infinite render loops
  notebookContent = notebookContent.replace(
    "export function Notebook() {",
    "const mockUser = { id: 'mock-user-id', email: 'dipak08v14@gmail.com' };\n\nexport function Notebook() {"
  );

  // Replace useAuth hook call
  notebookContent = notebookContent.replace(
    "const { user } = useAuth();",
    "const user = mockUser;"
  );

  // Replace fetchFolders and fetchEntries implementation to inject mock data
  const fetchFoldersOriginal = `  const fetchFolders = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('notebook_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (err: any) {
      console.error('Error fetching folders:', err);
      showError('Failed to load notebook folders.');
    }
  };`;

  const fetchFoldersMocked = `  const fetchFolders = async () => {
    const mockFolders = [
      { id: 'f1', name: 'Trading Ideas', color: '#6366f1', created_at: '', user_id: 'mock-user-id' },
      { id: 'f2', name: 'Trade Reviews', color: '#22c55e', created_at: '', user_id: 'mock-user-id' },
      { id: 'f3', name: 'Psychology Logs', color: '#ef4444', created_at: '', user_id: 'mock-user-id' }
    ];
    setFolders(mockFolders);
  };`;

  const fetchEntriesOriginal = `  const fetchEntries = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('notebook_entries')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      const loadedEntries = data || [];
      setAllEntries(loadedEntries);

      // Handle auto-open note logic from URL date parameter
      const dateParam = searchParams.get('date');
      if (dateParam) {
        const matchingNote = loadedEntries.find(n =>
          n.log_date && n.log_date.startsWith(dateParam)
        );
        if (matchingNote) {
          setActiveNoteId(matchingNote.id);
        } else {
          setDateFromDashboard(dateParam);
        }
        window.history.replaceState({}, '', '/notebook');
      }
    } catch (err: any) {
      console.error('Error fetching entries:', err);
      showError('Failed to load notebook notes.');
    }
  };`;

  const fetchEntriesMocked = `  const fetchEntries = async () => {
    const mockEntries = [
      { id: 'n1', folder_id: 'f1', title: 'ICT Silver Bullet Strategy', content: '<p>Focus on London open silver bullet setup between 3 AM and 4 AM EST. Key parameters: displacement, FVG form...</p>', tags: ['ICT', 'Silver Bullet'], is_deleted: false, created_at: '2026-07-16T10:00:00Z', updated_at: '2026-07-16T10:00:00Z', user_id: 'mock-user-id' },
      { id: 'n2', folder_id: 'f2', title: 'June 2026 Performance Review', content: '<p>Excellent month with a profit factor of 3.33. Need to focus on cutting losses on breakout failures...</p>', tags: ['Review', 'Monthly'], is_deleted: false, created_at: '2026-07-15T09:00:00Z', updated_at: '2026-07-15T09:00:00Z', user_id: 'mock-user-id' },
      { id: 'n3', folder_id: 'f3', title: 'FOMO Entry on Nifty', content: '<p>Tempted to chase the breakout after missing the first leg. Entered without a proper FVG pullback...</p>', tags: ['FOMO', 'Psychology'], is_deleted: false, created_at: '2026-07-17T11:00:00Z', updated_at: '2026-07-17T11:00:00Z', user_id: 'mock-user-id' }
    ];
    setAllEntries(mockEntries);
    setActiveNoteId('n1');
    setLocalTitle('ICT Silver Bullet Strategy');
  };`;

  // Find index in LF-only file
  const fIndex = notebookContent.indexOf(fetchFoldersOriginal.replace(/\r/g, ''));
  if (fIndex !== -1) {
    const endFIndex = notebookContent.indexOf('  };', fIndex + 100) + 4;
    notebookContent = notebookContent.slice(0, fIndex) + fetchFoldersMocked + notebookContent.slice(endFIndex);
    console.log("Successfully replaced fetchFolders definition!");
  } else {
    console.log("Could not locate fetchFolders definition by full string match!");
  }

  const eIndex = notebookContent.indexOf(fetchEntriesOriginal.replace(/\r/g, ''));
  if (eIndex !== -1) {
    const endEIndex = notebookContent.indexOf('  };', eIndex + 100) + 4;
    notebookContent = notebookContent.slice(0, eIndex) + fetchEntriesMocked + notebookContent.slice(endEIndex);
    console.log("Successfully replaced fetchEntries definition!");
  } else {
    console.log("Could not locate fetchEntries definition by full string match!");
  }

  fs.writeFileSync(notebookPath, notebookContent, 'utf8');

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

      await page.goto('http://localhost:3010/notebook', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 6000)); // wait 6 seconds for rendering

      const artDir = 'C:\\Users\\dipak\\.gemini\\antigravity\\brain\\5d143d0c-eb59-44c9-b64a-6361a797107a';
      const screenshotPath = path.join(artDir, 'notebook-mobile.png');
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
  console.log("Restoring App.tsx and Notebook.tsx backups...");
  fs.writeFileSync(appPath, appBackup, 'utf8');
  fs.writeFileSync(notebookPath, notebookBackup, 'utf8');
  console.log("Restoration complete.");
}
