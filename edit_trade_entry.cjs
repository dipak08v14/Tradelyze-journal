const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'TradeEntryPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add getBrokerCode and getAccountNumber
if (!content.includes('const getBrokerCode')) {
  content = content.replace(
    'const PREDEFINED_SYMBOLS = [',
    `const getBrokerCode = (broker: any) => {
  const name = (broker.broker_name || broker.broker_type || '').toLowerCase();
  if (name.includes('dhan')) return 'DH';
  if (name.includes('xm') || name.includes('global')) return 'XM';
  if (name.includes('metatrader') || name.includes('mt')) return 'MT';
  if (name.includes('zerodha')) return 'ZE';
  if (name.includes('upstox')) return 'UP';
  if (name.includes('angel') || name.includes('an')) return 'AN';
  const clean = name.replace(/[^a-z]/g, '');
  return clean.slice(0, 2).toUpperCase() || 'BR';
};

const getAccountNumber = (broker: any) => {
  return broker.account_login || broker.account_id || broker.account_number || 'N/A';
};

const PREDEFINED_SYMBOLS = [`
  );
}

// 2. Add State variables
if (!content.includes('brokerConnections')) {
  content = content.replace(
    'const [strategies, setStrategies] = useState<Strategy[]>([]);',
    `const [strategies, setStrategies] = useState<Strategy[]>([]);

  // Broker Connections State
  const [brokerConnections, setBrokerConnections] = useState<any[]>([]);
  const [selectedBroker, setSelectedBroker] = useState<any>(null);
  const [isBrokerDropdownOpen, setIsBrokerDropdownOpen] = useState<boolean>(false);
  const [initialAccountLogin, setInitialAccountLogin] = useState<string | null>(null);`
  );
}

// 3. Add useEffect to fetch broker connections
if (!content.includes('fetchBrokerConnections')) {
  content = content.replace(
    'fetchActiveStrategies();\n  }, [userId]);',
    `fetchActiveStrategies();
  }, [userId]);

  // Load broker connections
  useEffect(() => {
    if (!userId) return;
    const fetchBrokerConnections = async () => {
      try {
        const { data, error } = await supabase
          .from('broker_connections')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('last_sync_at', { ascending: false });

        if (!error && data) {
          setBrokerConnections(data);
        }
      } catch (err: any) {
        console.error('Error fetching broker connections:', err);
      }
    };
    fetchBrokerConnections();
  }, [userId]);

  // Default Selection Logic
  useEffect(() => {
    if (brokerConnections.length > 0) {
      if (isEditMode && initialAccountLogin) {
        const match = brokerConnections.find(b => getAccountNumber(b) === initialAccountLogin);
        setSelectedBroker(match || brokerConnections[0]);
      } else if (!isEditMode && !selectedBroker) {
        setSelectedBroker(brokerConnections[0]);
      }
    }
  }, [brokerConnections, isEditMode, initialAccountLogin]);`
  );
}

// 4. In fetchTradeForEdit, read account_login
if (!content.includes('setInitialAccountLogin(tradeData.account_login || null);')) {
  content = content.replace(
    'setDate(tradeData.date || \'\');',
    `setInitialAccountLogin(tradeData.account_login || null);
          setDate(tradeData.date || '');`
  );
}

// 5. Insert Payload - Update
if (!content.includes('account_login: selectedBroker ? getAccountNumber(selectedBroker) : null,')) {
  content = content.replace(
    'strategy_id: strategyId || null,\n            date: date,',
    `account_login: selectedBroker ? getAccountNumber(selectedBroker) : null,
            strategy_id: strategyId || null,
            date: date,`
  );
}

// 6. JSX Render
const jsxToInsert = `
                    {/* Account Selector row */}
                    <div className="mb-4">
                      <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                        Trading Account
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsBrokerDropdownOpen(!isBrokerDropdownOpen)}
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                        >
                          {selectedBroker ? (
                            <div className="flex items-center space-x-2">
                              <span className={\`w-2 h-2 rounded-full inline-block \${selectedBroker.is_active ? 'bg-emerald-500' : 'bg-red-500'}\`}></span>
                              <span className="font-mono">{getBrokerCode(selectedBroker)} {getAccountNumber(selectedBroker)}</span>
                            </div>
                          ) : (
                            <span className="font-mono text-[var(--text-muted)]">Manual / No Account</span>
                          )}
                          <span className="ml-2 text-[var(--text-muted)] opacity-70">▼</span>
                        </button>

                        {isBrokerDropdownOpen && (
                          <div className="absolute top-full mt-1 left-0 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden z-[100]">
                            {brokerConnections.length === 0 ? (
                              <div className="p-3 text-sm text-[var(--text-muted)] text-center">No connected brokers</div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto">
                                {brokerConnections.map((broker) => (
                                  <button
                                    key={broker.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedBroker(broker);
                                      setIsBrokerDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--border)] transition-colors text-left"
                                  >
                                    <span className={\`w-2 h-2 rounded-full inline-block \${broker.is_active ? 'bg-emerald-500' : 'bg-red-500'}\`}></span>
                                    <span className="font-mono">{getBrokerCode(broker)} {getAccountNumber(broker)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
`;

if (!content.includes('Trading Account')) {
  content = content.replace(
    '{/* Date and Entry Time row */}',
    jsxToInsert + '\n                    {/* Date and Entry Time row */}'
  );
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully edited TradeEntryPage.tsx');
