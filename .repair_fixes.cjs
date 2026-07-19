const fs = require('fs');

let c = fs.readFileSync('src/pages/StrategyBuilderPage.tsx', 'utf8');

// Fix 2: State declarations
c = c.replace(
  `  const [deleteModalOpen, setDeleteModalOpen] = useState(false);`,
  `  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);`
);

// Fix 2: Data Loading useEffect snapshot
c = c.replace(
  `          setEntryRules(loadedEntries.length > 0 ? loadedEntries : [{ id: makeId(), rule_text: '', rule_order: 1 }]);
          setExitRules(loadedExits.length > 0 ? loadedExits : [{ id: makeId(), rule_text: '', rule_order: 1 }]);
        }`,
  `          const initialEntries = loadedEntries.length > 0 ? loadedEntries : [{ id: makeId(), rule_text: '', rule_order: 1 }];
          const initialExits = loadedExits.length > 0 ? loadedExits : [{ id: makeId(), rule_text: '', rule_order: 1 }];
          setEntryRules(initialEntries);
          setExitRules(initialExits);

          setInitialSnapshot(JSON.stringify({ 
            name: strat.name || '', 
            srNo: strat.sr_no || 1, 
            typeOfStrategy: strat.type_of_strategy || '', 
            subType: strat.sub_type || '', 
            status: strat.status || 'active', 
            notes: strat.notes || '', 
            entryRules: initialEntries, 
            exitRules: initialExits 
          }));
        }`
);

// Fix 2: !isEditMode snapshot & isDirty
c = c.replace(
  `  // Max sr_no calculations (Create Mode Only)`,
  `  useEffect(() => {
    if (!isEditMode) {
      setInitialSnapshot(JSON.stringify({ 
        name: '', srNo: 1, typeOfStrategy: '', subType: '', status: 'active', notes: '', 
        entryRules: [{ id: 'initial-entry-1', rule_text: '', rule_order: 1 }], 
        exitRules: [{ id: 'initial-exit-1', rule_text: '', rule_order: 1 }] 
      }));
    }
  }, [isEditMode]);

  const isDirty = 
    JSON.stringify({ name, srNo, typeOfStrategy, subType, status, notes, entryRules, exitRules }) !== initialSnapshot ||
    markedForDeletion.length > 0 ||
    pendingUploads.length > 0;

  // Max sr_no calculations (Create Mode Only)`
);

// Fix 2: Update snapshot when findMaxSrNo updates srNo (so it doesn't trigger dirty flag on load)
c = c.replace(
  `        if (data && data.length > 0) {
          setSrNo(Number(data[0].sr_no || 0) + 1);
        } else {
          setSrNo(1);
        }`,
  `        if (data && data.length > 0) {
          const nextSr = Number(data[0].sr_no || 0) + 1;
          setSrNo(nextSr);
          setInitialSnapshot(prev => { try { const p = JSON.parse(prev); p.srNo = nextSr; return JSON.stringify(p); } catch { return prev; } });
        } else {
          setSrNo(1);
        }`
);


// Fix 1: Title
c = c.replace(
  `{isEditMode ? \`Edit Strategy — \${name || 'Setup'}\` : 'New Strategy'}`,
  `{isEditMode ? (name || 'Strategy') : 'New Strategy'}`
);

// Fix 3: Cancel Button
c = c.replace(
  `                    <button
                      type="submit"
                      disabled={saving}
                      style={{`,
  `                    <button
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
                      type="submit"
                      disabled={saving}
                      style={{`
);

// Fix 4: Unsaved Changes Warning Modal
c = c.replace(
  `      {/* DELETE CONFIRMATION MODAL */}`,
  `      {/* UNSAVED CHANGES WARNING MODAL */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-2xl border overflow-hidden p-6 animate-in scale-in duration-200 border-amber-500/30"
            style={{ backgroundColor: 'var(--card)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)' }}
          >
            <div className="flex items-center gap-2 text-amber-500 mb-3 font-mono font-bold text-sm uppercase tracking-wider">
              <span>⚠️ Unsaved Changes</span>
            </div>
            
            <p className="text-xs font-sans leading-relaxed mb-6" style={{ color: 'var(--text-sub)' }}>
              You have unsaved changes to this strategy. If you leave now, these changes will be lost.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="px-4 py-2 text-xs font-mono font-bold hover:text-[var(--text)] cursor-pointer rounded-lg bg-transparent hover:bg-[var(--bar)] transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => navigate(isEditMode ? \`/strategies/\${strategyId}\` : '/strategies')}
                className="px-4 py-2 text-xs font-mono font-bold rounded-lg text-white bg-red-600 hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/10 cursor-pointer transition-all shrink-0"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}`
);

fs.writeFileSync('src/pages/StrategyBuilderPage.tsx', c);
console.log('Fixed StrategyBuilderPage.tsx');

let sd = fs.readFileSync('src/pages/StrategyDetail.tsx', 'utf8');
sd = sd.replace(
  `<h1 className="text-2xl font-bold tracking-tight font-display" style={{ color: 'var(--text)' }}>`,
  `<h1 className="font-bold tracking-tight font-display" style={{ color: 'var(--text)', fontSize: '28px', letterSpacing: '-0.3px' }}>`
);
fs.writeFileSync('src/pages/StrategyDetail.tsx', sd);
console.log('Fixed StrategyDetail.tsx');
