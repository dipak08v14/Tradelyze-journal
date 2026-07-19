const fs = require('fs');

const files = [
  'TradeEntryPage.tsx',
  'AiTeacherPage.tsx',
  'StrategiesPage.tsx'
];

let out = '';

const classRegex = /className=(?:\{`|["'])(.*?)(?:`\}|["'])/gs;
const styleRegex = /style=\{\{([\s\S]*?)\}\}/gs;

files.forEach(file => {
    let content;
    try {
        content = fs.readFileSync(file, 'utf8');
    } catch(e) {
        out += `Could not read ${file}\n`;
        return;
    }

    out += `\n======================================\n`;
    out += `FILE: ${file}\n`;
    out += `======================================\n`;

    const lines = content.split('\n');
    const getLine = (index) => {
        let current = 0;
        for (let i = 0; i < lines.length; i++) {
            current += lines[i].length + 1;
            if (current > index) return i + 1;
        }
        return lines.length;
    };

    const results = [];
    let match;

    while ((match = classRegex.exec(content)) !== null) {
        const cls = match[1].replace(/\n/g, ' ');
        const lineNum = getLine(match.index);
        let hasShadow = /\bshadow(?:-[a-zA-Z0-9\/\[\]\-]+)?\b/.test(cls);
        let isFlatCandidate = false;
        
        if (!hasShadow && (cls.includes('bg-[var(--card)]') || cls.includes('bg-card') || cls.includes('bg-white') || cls.includes('border')) && cls.includes('border') && (cls.includes('rounded') || cls.includes('borderRadius'))) {
            isFlatCandidate = true;
        }
        
        if (hasShadow || isFlatCandidate) {
            results.push({
                type: 'class',
                lineNum: lineNum,
                content: match[0],
                hasShadow: hasShadow
            });
        }
    }

    while ((match = styleRegex.exec(content)) !== null) {
        const style = match[1];
        const lineNum = getLine(match.index);
        let hasShadow = /boxShadow/.test(style);
        let isFlatCandidate = false;
        
        if (!hasShadow && style.includes('backgroundColor') && (style.includes('var(--card)') || style.includes('var(--background)')) && (style.includes('border:') || style.includes('borderColor'))) {
            isFlatCandidate = true;
        }
        
        if (hasShadow || isFlatCandidate) {
            results.push({
                type: 'style',
                lineNum: lineNum,
                content: match[0],
                hasShadow: hasShadow
            });
        }
    }

    results.sort((a, b) => a.lineNum - b.lineNum);

    results.forEach(res => {
        const isStandard = res.content.replace(/\s+/g,'').includes('01px3pxrgba(0,0,0,0.04),01px2pxrgba(0,0,0,0.06)');
        const isElevated = res.content.replace(/\s+/g,'').includes('04px6pxrgba(0,0,0,0.05),02px4pxrgba(0,0,0,0.06)');
        
        if (isStandard || isElevated) {
            // Skip perfectly matched ones? The prompt says "find EVERY element... that is NOT already using the exact target STANDARD or ELEVATED value"
            // Let's just output them but mark them so I can ignore them in the final report, or just skip them.
            // Let's mark them to be safe.
            out += `\n--- MATCH AT LINE ${res.lineNum} (ALREADY CORRECT TARGET SPECS, IGNORING) ---\n`;
        } else {
            out += `\n--- MATCH AT LINE ${res.lineNum} (${res.hasShadow ? 'Has Shadow' : 'Flat Candidate'}) ---\n`;
        }
        
        out += `Code: ${res.content.trim().replace(/\n/g, ' ')}\n`;
        const start = Math.max(0, res.lineNum - 3);
        const end = Math.min(lines.length - 1, res.lineNum + 3);
        out += 'Context:\n';
        for(let i = start; i <= end; i++) {
            out += `${i+1}: ${lines[i]}\n`;
        }
    });
});

fs.writeFileSync('3files_exhaustive.txt', out);
