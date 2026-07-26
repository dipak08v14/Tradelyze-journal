const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');
content = content.replace(/\r\n/g, '\n');

// Fix button display
content = content.replace(
`                    {selectedBroker ? (
                      <>
                        <span className={\`w-2 h-2 rounded-full inline-block \${selectedBroker.is_active ? 'bg-emerald-500' : 'bg-red-500'}\`}></span>
                        <span className="font-mono">{getBrokerCode(selectedBroker)} {getAccountNumber(selectedBroker)}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full inline-block bg-red-500"></span>
                        <span className="font-mono">NO BROKERS</span>
                      </>
                    )}`,
`                    {selectedBroker === 'all' ? (
                      <span className="font-mono">All Accounts</span>
                    ) : selectedBroker ? (
                      <>
                        <span className={\`w-2 h-2 rounded-full inline-block \${selectedBroker.is_active ? 'bg-emerald-500' : 'bg-red-500'}\`}></span>
                        <span className="font-mono">{getBrokerCode(selectedBroker)} {getAccountNumber(selectedBroker)}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full inline-block bg-red-500"></span>
                        <span className="font-mono">NO BROKERS</span>
                      </>
                    )}`
);

// Fix dropdown map and handlers
content = content.replace(
`                      ) : (

                          <button
                            key={broker.id}
                            onClick={() => {
                              setSelectedBroker(broker);
                              setIsBrokerDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-[rgba(0,0,0,0.03)] flex items-center gap-2 transition-all border-none"
                            style={{ color: 'var(--text)', cursor: 'pointer', backgroundColor: 'transparent', padding: '8px 16px' }}
                          >
                            <span className={\`w-2 h-2 rounded-full inline-block \${broker.is_active ? 'bg-emerald-500' : 'bg-red-500'}\`}></span>
                            <span className="font-mono">{getBrokerCode(broker)} {getAccountNumber(broker)}</span>
                          </button>
                          ))}
                        </>`,
`                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleBrokerSelect('all')}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-[rgba(0,0,0,0.03)] flex items-center gap-2 transition-all border-none border-b border-[var(--border)]"
                            style={{ color: 'var(--text)', cursor: 'pointer', backgroundColor: 'transparent', padding: '8px 16px' }}
                          >
                            <span className="font-mono">All Accounts</span>
                          </button>
                          {brokerConnections.map((broker) => (
                          <button
                            key={broker.id}
                            onClick={() => handleBrokerSelect(broker)}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-[rgba(0,0,0,0.03)] flex items-center gap-2 transition-all border-none"
                            style={{ color: 'var(--text)', cursor: 'pointer', backgroundColor: 'transparent', padding: '8px 16px' }}
                          >
                            <span className={\`w-2 h-2 rounded-full inline-block \${broker.is_active ? 'bg-emerald-500' : 'bg-red-500'}\`}></span>
                            <span className="font-mono">{getBrokerCode(broker)} {getAccountNumber(broker)}</span>
                          </button>
                          ))}
                        </>`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('UI patch complete');
