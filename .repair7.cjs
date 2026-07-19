const fs = require('fs');

let c = fs.readFileSync('src/pages/StrategyBuilderPage.tsx', 'utf8');

const target = `    const findMaxSrNo = async () => {
      try {
        const { data, error } = await supabase
          .from('strategies')
          .select('sr_no')
          .eq('user_id', userId)
          .order('sr_no', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          setSrNo(Number(data[0].sr_no || 0) + 1);
        } else {
          setSrNo(1);
        }
      } catch (err) {
        console.warn('Could not determine next serial number:', err);
        setSrNo(1);
      }
    };`;

const replacement = `    const findMaxSrNo = async () => {
      try {
        const { data, error } = await supabase
          .from('strategies')
          .select('sr_no')
          .eq('user_id', userId)
          .order('sr_no', { ascending: false })
          .limit(1);

        if (error) throw error;

        const resolvedSrNo = data && data.length > 0 ? Number(data[0].sr_no || 0) + 1 : 1;
        setSrNo(resolvedSrNo);
        
        setInitialSnapshot(prev => {
          if (!prev) return prev;
          const parsed = JSON.parse(prev);
          return JSON.stringify({ ...parsed, srNo: resolvedSrNo });
        });
      } catch (err) {
        console.warn('Could not determine next serial number:', err);
        setSrNo(1);
        setInitialSnapshot(prev => {
          if (!prev) return prev;
          const parsed = JSON.parse(prev);
          return JSON.stringify({ ...parsed, srNo: 1 });
        });
      }
    };`;

// Use simple whitespace normalization for safety just in case
const normalize = (str) => str.replace(/\s+/g, ' ').trim();

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync('src/pages/StrategyBuilderPage.tsx', c);
  console.log('Fixed StrategyBuilderPage.tsx successfully.');
} else {
  console.error('ERROR: Target block not found. Trying regex/fallback replacement...');
  
  // Regex fallback: find exactly the findMaxSrNo function block
  const regex = /const findMaxSrNo = async \(\) => \{[\s\S]*?console\.warn\([^)]+\);[\s\S]*?setSrNo\(1\);[\s\S]*?\}[\s\S]*?\};/;
  
  if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('src/pages/StrategyBuilderPage.tsx', c);
    console.log('Fixed StrategyBuilderPage.tsx via Regex fallback successfully.');
  } else {
    console.error('FATAL: Could not find target to replace.');
    process.exit(1);
  }
}
