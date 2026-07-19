const fs = require('fs');
let c = fs.readFileSync('Notebook.tsx', 'utf8');

const elevatedShadow = "boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)'";

c = c.replace(
`          <div
            style={{ boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)' }}
          className={\`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[400px] flex flex-col overflow-y-auto transition-transform duration-250 ease-in-out \${
              notebookDrawerOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:static lg:z-auto lg:w-auto lg:max-w-none lg:flex-row lg:translate-x-0 lg:shadow-none lg:overflow-visible\`}
            style={{ backgroundColor: 'var(--card)' }}
          >`,
`          <div
          className={\`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[400px] flex flex-col overflow-y-auto transition-transform duration-250 ease-in-out \${
              notebookDrawerOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:static lg:z-auto lg:w-auto lg:max-w-none lg:flex-row lg:translate-x-0 lg:shadow-none lg:overflow-visible\`}
            style={{ backgroundColor: 'var(--card)', ${elevatedShadow} }}
          >`
);

fs.writeFileSync('Notebook.tsx', c);
