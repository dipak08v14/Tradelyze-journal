const fs = require('fs');
const files = ['DashboardPage.tsx', 'TradingLogsPage.tsx', 'DailyJournal.tsx', 'TradeEntryPage.tsx', 'SettingsPage.tsx', 'AiTeacherPage.tsx', 'StrategiesPage.tsx', 'RiskCalculatorPage.tsx'];

let out = '';
files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  out += '=== ' + file + ' ===\n';
  
  const classShadowRegex = /className=[^{]*?['"]([^'"]*(?:shadow(?:-[a-z0-9]+)*|bg-(?:white|\[var\(--card\)\]|card)[^'"]*rounded[^'"]*border)[^'"]*)['"]/g;
  const classMatches = [...content.matchAll(classShadowRegex)];
  
  // also handle template literals className={`...`}
  const templateClassShadowRegex = /className=\{`([^`]*(?:shadow(?:-[a-z0-9]+)*|bg-(?:white|\[var\(--card\)\]|card)[^`]*rounded[^`]*border)[^`]*)`\}/g;
  const templateMatches = [...content.matchAll(templateClassShadowRegex)];
  
  const styleRegex = /style=\{\{([^}]*(?:boxShadow|backgroundColor:\s*'var\(--card\)'[^}]*border|border:[^}]*backgroundColor)[^}]*)\}\}/g;
  const styleMatches = [...content.matchAll(styleRegex)];
  
  const seen = new Set();
  
  const lines = content.split('\n');
  const getLine = (index) => {
    let current = 0;
    for (let i = 0; i < lines.length; i++) {
       current += lines[i].length + 1;
       if (current > index) return { lineNum: i + 1, text: lines[i].trim() };
    }
    return { lineNum: 0, text: '' };
  };
  
  const processMatch = (cls, matchIndex, type) => {
     if (type === 'class') {
         const shadows = cls.split(/\s+/).filter(c => c.startsWith('shadow'));
         let key = '';
         if (shadows.length) key = shadows.join(' ');
         else if (cls.includes('bg-') && cls.includes('rounded') && cls.includes('border')) key = 'Flat Class (No Shadow)';
         
         if (key && !seen.has(key)) {
            seen.add(key);
            const lineInfo = getLine(matchIndex);
            out += 'Approach: ' + key + ' | Line ' + lineInfo.lineNum + ': ' + lineInfo.text.substring(0, 150) + '\n';
         }
     } else if (type === 'style') {
         let key = '';
         if (cls.includes('boxShadow')) {
            const bs = cls.match(/boxShadow:\s*'([^']+)'/);
            if (bs) key = 'Inline Box-Shadow: ' + bs[1];
         } else if (cls.includes('backgroundColor') && (cls.includes('border:') || cls.includes('borderColor'))) {
            key = 'Flat Style (No Shadow)';
         }
         
         if (key && !seen.has(key)) {
            seen.add(key);
            const lineInfo = getLine(matchIndex);
            out += 'Approach: ' + key + ' | Line ' + lineInfo.lineNum + ': ' + lineInfo.text.substring(0, 150) + '\n';
         }
     }
  };
  
  classMatches.forEach(m => processMatch(m[1], m.index, 'class'));
  templateMatches.forEach(m => processMatch(m[1], m.index, 'class'));
  styleMatches.forEach(m => processMatch(m[1], m.index, 'style'));
  
});
fs.writeFileSync('shadow_final_audit.txt', out);
