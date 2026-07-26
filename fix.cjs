const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'TradeEntryPage.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

const fixedChunk = `          .eq('user_id', userId)
          .eq('status', 'active')
          .order('sr_no', { ascending: true });

        if (error) throw error;
        if (data) {
          setStrategies(data as Strategy[]);
        }
      } catch (err: any) {
        console.error('Error fetching active strategies:', err);
      }
    };
    fetchActiveStrategies();
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
  }, [brokerConnections, isEditMode, initialAccountLogin]);

  // Load existing trade configuration when in edit mode
  useEffect(() => {
    if (!userId || !id) return;

    const fetchTradeForEdit = async () => {
      setLoading(true);
      try {
        let tradeData: any = null;
        try {
          const { data, error } = await supabase`;

// We keep up to line 213 (0-indexed 212)
// Line 214 (0-indexed 213) is '            .from('trades')'
const beforeLines = lines.slice(0, 213);
const afterLines = lines.slice(213);

const newContent = beforeLines.join('\n') + '\n' + fixedChunk + '\n' + afterLines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf-8');
console.log('Fixed TradeEntryPage.tsx');
