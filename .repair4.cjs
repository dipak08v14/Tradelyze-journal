const fs = require('fs');
let c = fs.readFileSync('src/pages/AiTeacherPage.tsx', 'utf8');

c = c.replace(/<\/header>[\s\S]*?AI Teacher[\s\S]*?<\/h1>[\s\S]*?<\/div>/, `</header>

        {/* CONTAINER CONTENT */}
        <div className="flex-1 flex flex-col h-full max-h-dvh overflow-hidden">
          {/* HEADER ROW WITH COUNTER */}
          <header 
            style={{
              background: 'var(--card)',
              width: 'calc(100% + 32px)',
              marginLeft: '-16px',
              marginRight: '-16px',
              paddingTop: '3px',
              paddingBottom: '3px',
              paddingLeft: '16px',
              paddingRight: '16px',
              borderRadius: 0,
              boxShadow: 'none',
              border: 'none',
              borderBottom: '1px solid var(--border)'
            }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Brain style={{ color: 'var(--accent)' }} className="w-6 h-6 animate-pulse" />
              <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.3px' }} className="tracking-tight font-display">
                AI Teacher
              </h1>
            </div>`);

fs.writeFileSync('src/pages/AiTeacherPage.tsx', c);
