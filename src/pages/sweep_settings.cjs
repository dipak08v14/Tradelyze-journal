const fs = require('fs');
const content = fs.readFileSync('SettingsPage.tsx', 'utf8');

// Match className="..." or className={`...`}
const classRegex = /className=(?:\{`|["'])(.*?)(?:`\}|["'])/gs;
// Match style={{...}}
const styleRegex = /style=\{\{([\s\S]*?)\}\}/gs;

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

// Process classNames
while ((match = classRegex.exec(content)) !== null) {
    const cls = match[1].replace(/\n/g, ' ');
    const lineNum = getLine(match.index);
    let hasShadow = /\bshadow(?:-[a-z0-9]+)*\b/.test(cls);
    let isFlatCandidate = false;
    
    if (!hasShadow && (cls.includes('bg-[var(--card)]') || cls.includes('bg-card') || cls.includes('bg-white')) && cls.includes('border') && (cls.includes('rounded') || cls.includes('borderRadius'))) {
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

// Process styles
while ((match = styleRegex.exec(content)) !== null) {
    const style = match[1];
    const lineNum = getLine(match.index);
    let hasShadow = /boxShadow/.test(style);
    let isFlatCandidate = false;
    
    if (!hasShadow && style.includes('backgroundColor') && style.includes('var(--card)') && (style.includes('border:') || style.includes('borderColor'))) {
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

let out = '';
results.forEach(res => {
    out += `\n--- MATCH AT LINE ${res.lineNum} (${res.hasShadow ? 'Has Shadow' : 'Flat Candidate'}) ---\n`;
    out += `Code: ${res.content.trim().replace(/\n/g, ' ')}\n`;
    const start = Math.max(0, res.lineNum - 3);
    const end = Math.min(lines.length - 1, res.lineNum + 3);
    out += 'Context:\n';
    for(let i = start; i <= end; i++) {
        out += `${i+1}: ${lines[i]}\n`;
    }
});

fs.writeFileSync('settings_exhaustive.txt', out);
