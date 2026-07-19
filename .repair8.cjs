const fs = require('fs');

let c = fs.readFileSync('src/pages/StrategyBuilderPage.tsx', 'utf8');

console.log('--- VERIFICATION ---');
console.log('Has "showUnsavedWarning":', c.includes('showUnsavedWarning'));
console.log('Has "Unsaved Changes":', c.includes('Unsaved Changes'));
console.log('Has "Cancel":', c.includes('Cancel'));

const target = `<div className="flex flex-row items-center gap-2.5">
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
                    onClick={handleSave}`;

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

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync('src/pages/StrategyBuilderPage.tsx', c);
  console.log('Fixed StrategyBuilderPage.tsx button row successfully.');
} else {
  console.error('ERROR: Target block not found.');
  process.exit(1);
}
