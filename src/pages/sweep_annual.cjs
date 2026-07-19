const fs = require('fs');

let out = '';
const file = 'AnnualReportsPage.tsx';

let content;
try {
    content = fs.readFileSync(file, 'utf8');
} catch(e) {
    console.error(`Could not read ${file}`);
    process.exit(1);
}

out += `\n======================================\n`;
out += `FILE: ${file}\n`;
out += `======================================\n`;

const classRegex = /className=(?:\{`|["'])(.*?)(?:`\}|["'])/gs;
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
    const noSpaces = res.content.replace(/\s+/g,'');
    const isStandard = noSpaces.includes('01px3pxrgba(0,0,0,0.04),01px2pxrgba(0,0,0,0.06)');
    const isElevated = noSpaces.includes('04px6pxrgba(0,0,0,0.05),02px4pxrgba(0,0,0,0.06)');
    
    if (isStandard || isElevated) {
        return; 
    }
    
    out += `[Line ${res.lineNum}] (${res.hasShadow ? 'Has Shadow' : 'Flat Candidate'}): ${res.content.trim().replace(/\n/g, ' ')}\n`;
});

fs.writeFileSync('annual_exhaustive.txt', out);
