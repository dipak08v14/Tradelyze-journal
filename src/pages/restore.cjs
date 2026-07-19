const fs = require('fs');
let c = fs.readFileSync('Notebook.tsx', 'utf8');

const brokenPart = `{notebookDrawerOpen && (
            <div
              className="w-full lg:w-[220px] lg:shrink-0 h-auto lg:h-full overflow-y-auto flex flex-col justify-between p-4 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
            >`;

const fixedPart = `{notebookDrawerOpen && (
            <div
              className="fixed inset-0 z-40 lg:hidden transition-opacity backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              onClick={() => setNotebookDrawerOpen(false)}
            />
          )}
          {/* MOBILE DRAWER WRAPPER — Folders + Notes List (stacked on mobile, side-by-side on desktop) */}
          <div
            className={\`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[400px] flex flex-col overflow-y-auto transition-transform duration-250 ease-in-out \${
              notebookDrawerOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:static lg:z-auto lg:w-auto lg:max-w-none lg:flex-row lg:translate-x-0 lg:shadow-none lg:overflow-visible\`}
            style={{ backgroundColor: 'var(--card)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)' }}
          >

            {/* PANEL 1: FOLDERS (220px) */}
            <aside
              id="notebook-panel-folders"
              className="w-full lg:w-[220px] lg:shrink-0 h-auto lg:h-full overflow-y-auto flex flex-col justify-between p-4 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
            >`;

c = c.replace(brokenPart, fixedPart);

fs.writeFileSync('Notebook.tsx', c);
