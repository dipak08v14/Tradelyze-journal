const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');
content = content.replace(/\\r\\n/g, '\\n'); // normalize for exact match

// 4. Update Dropdown UI Button
content = content.replace(
  \`                    onClick={() => setIsBrokerDropdownOpen(!isBrokerDropdownOpen)}
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    className="flex items-center space-x-3 px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none hover:bg-[var(--card-hover)] transition-colors shadow-sm"
                  >
                    {selectedBroker ? (
                      <div className="flex items-center space-x-2">
                        <span className={\\\`w-2 h-2 rounded-full inline-block \\\${selectedBroker.is_active ? 'bg-emerald-500' : 'bg-red-500'}\\\`}></span>
                        <span className="font-mono">{getBrokerCode(selectedBroker)} {getAccountNumber(selectedBroker)}</span>
                      </div>
                    ) : (
                      <span className="font-mono">NO BROKERS</span>
                    )}
                    <span className="text-[var(--text-muted)] opacity-70 text-xs">▼</span>\`,
  \`                    onClick={() => setIsBrokerDropdownOpen(!isBrokerDropdownOpen)}
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    className="flex items-center space-x-3 px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none hover:bg-[var(--card-hover)] transition-colors shadow-sm"
                  >
                    {selectedBroker === 'all' ? (
                      <span className="font-mono">All Accounts</span>
                    ) : selectedBroker ? (
                      <div className="flex items-center space-x-2">
                        <span className={\\\`w-2 h-2 rounded-full inline-block \\\${selectedBroker.is_active ? 'bg-emerald-500' : 'bg-red-500'}\\\`}></span>
                        <span className="font-mono">{getBrokerCode(selectedBroker)} {getAccountNumber(selectedBroker)}</span>
                      </div>
                    ) : (
                      <span className="font-mono">NO BROKERS</span>
                    )}
                    <span className="text-[var(--text-muted)] opacity-70 text-xs">▼</span>\`
);

// 4b. Update Dropdown Menu List
content = content.replace(
  \`                    <div className="absolute top-full mt-1 right-0 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden z-[100]">
                      {brokerConnections.length === 0 ? (
                        <div className="p-3 text-sm text-[var(--text-muted)] text-center">No connected brokers</div>
                      ) : (
                        brokerConnections.map((broker) => (
                          <button
                            key={broker.id}
                            type="button"
                            onClick={() => {
                              setSelectedBroker(broker);
                              setIsBrokerDropdownOpen(false);
                            }}\`,
  \`                    <div className="absolute top-full mt-1 right-0 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden z-[100]">
                      {brokerConnections.length === 0 ? (
                        <div className="p-3 text-sm text-[var(--text-muted)] text-center">No connected brokers</div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleBrokerSelect('all')}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--border)] transition-colors text-left border-b border-[var(--border)]"
                          >
                            <span className="font-mono">All Accounts</span>
                          </button>
                          {brokerConnections.map((broker) => (
                            <button
                              key={broker.id}
                              type="button"
                              onClick={() => handleBrokerSelect(broker)}\`
);

content = content.replace(
  \`                          </button>
                        ))
                      )}\`,
  \`                          </button>
                          ))}
                        </>
                      )}\`
);


// 5. Update Queries
// 5a. needsReview count
content = content.replace(
  \`      // 2. Fetch needs review count from trades table
      const { count: needsReview, error: countError } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('needs_review', true);\`,
  \`      // 2. Fetch needs review count from trades table
      let reviewQuery = supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('needs_review', true);
      
      if (selectedBroker && selectedBroker !== 'all') {
        reviewQuery = reviewQuery.eq('account_login', getAccountNumber(selectedBroker));
      }
      
      const { count: needsReview, error: countError } = await reviewQuery;\`
);

// 5b. interval dependencies
content = content.replace(
  \`    return () => clearInterval(interval);
  }, [userId]);\`,
  \`    return () => clearInterval(interval);
  }, [userId, selectedBroker]);\`
);

// 5c. fetchYears query
content = content.replace(
  \`    const fetchYears = async () => {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('year')
          .eq('user_id', userId);\`,
  \`    const fetchYears = async () => {
      try {
        let yearQuery = supabase
          .from('trades')
          .select('year')
          .eq('user_id', userId);
          
        if (selectedBroker && selectedBroker !== 'all') {
          yearQuery = yearQuery.eq('account_login', getAccountNumber(selectedBroker));
        }

        const { data, error } = await yearQuery;\`
);
content = content.replace(
  \`    fetchYears();
  }, [userId]);\`,
  \`    fetchYears();
  }, [userId, selectedBroker]);\`
);

// 5d. fetchDashboardContext tradesRes
content = content.replace(
  \`        // STEP 1 — Fetch filtered and all history trades in parallel:
        const [tradesRes, allHistoryRes] = await Promise.all([
          supabase
            .from('trades')
            .select('id, *, strategies(name)')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true })
            .order('entry_time', { ascending: true }),
          supabase
            .from('trades')
            .select('id, *, strategies(name)')
            .eq('user_id', userId)
            .order('date', { ascending: true })
            .order('entry_time', { ascending: true })
        ]);\`,
  \`        // STEP 1 — Fetch filtered and all history trades in parallel:
        let tradesQuery = supabase
          .from('trades')
          .select('id, *, strategies(name)')
          .eq('user_id', userId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true })
          .order('entry_time', { ascending: true });
          
        let allHistoryQuery = supabase
          .from('trades')
          .select('id, *, strategies(name)')
          .eq('user_id', userId)
          .order('date', { ascending: true })
          .order('entry_time', { ascending: true });

        if (selectedBroker && selectedBroker !== 'all') {
          const acc = getAccountNumber(selectedBroker);
          tradesQuery = tradesQuery.eq('account_login', acc);
          allHistoryQuery = allHistoryQuery.eq('account_login', acc);
        }

        const [tradesRes, allHistoryRes] = await Promise.all([
          tradesQuery,
          allHistoryQuery
        ]);\`
);

content = content.replace(
  \`    fetchDashboardContext();
  }, [userId, startDate, endDate, showError]);\`,
  \`    fetchDashboardContext();
  }, [userId, startDate, endDate, showError, selectedBroker]);\`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully patched DashboardPage.tsx - pass 2');
