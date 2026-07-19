const fs = require('fs');

let c = fs.readFileSync('src/pages/StrategyBuilderPage.tsx', 'utf8');

const regex = /<div className="flex flex-row items-center gap-2\.5">[\s\S]*?\{isEditMode && \([\s\S]*?<button[\s\S]*?onClick=\{\(\) => setDeleteModalOpen\(true\)\}[\s\S]*?disabled=\{saving\}[\s\S]*?style=\{\{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '6px 20px' \}\}[\s\S]*?className="max-sm:flex-1 hover:opacity-90 transition-all"[\s\S]*?>[\s\S]*?Delete Strategy[\s\S]*?<\/button>[\s\S]*?\)\}[\s\S]*?<button[\s\S]*?onClick=\{handleSave\}/;

const replacement = `<div className="flex flex-row items-center gap-2.5">
                  {isEditMode && (
                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      disabled={saving}
                      style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '6px 20px' }}
                      className="max-sm:flex-1 hover:opacity-90 transition-all"
                    >
                      Delete Strategy
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (isDirty) {
                        setShowUnsavedWarning(true);
                      } else {
                        navigate(isEditMode ? \`/strategies/\${strategyId}\` : '/strategies');
                      }
                    }}
                    style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', color: 'var(--text-sub)' }}
                    className="max-sm:flex-1 hover:opacity-90 transition-all px-5 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}`;

if (regex.test(c)) {
  c = c.replace(regex, replacement);
  fs.writeFileSync('src/pages/StrategyBuilderPage.tsx', c);
  console.log('Fixed StrategyBuilderPage.tsx button row successfully via regex!');
} else {
  console.error('ERROR: Target block not found via regex.');
  process.exit(1);
}
