const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'StrategyDetail.tsx');
let content = fs.readFileSync(filePath, 'utf-8');
content = content.replace(/\r\n/g, '\n');

function replace(target, replacement) {
    if (!content.includes(target)) {
        console.warn("Could not find target:\\n" + target.substring(0, 80));
    } else {
        content = content.replace(target, replacement);
        console.log("Replaced target");
    }
}

// 1. Import
replace(
`import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';`,
`import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useActiveAccount, applyAccountFilter } from '../hooks/useActiveAccount';
import { Sidebar } from '../components/Sidebar';`
);

// 2. Extract activeAccount
replace(
`  const { user, userId, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();`,
`  const { user, userId, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const { activeAccount } = useActiveAccount();
  const navigate = useNavigate();`
);

// 3. trades Query
replace(
`        supabase
          .from('trades')
          .select('id, date, symbol, direction, option_type, pnl, r_multiple, status, execution_status, holding_time_mins')
          .eq('strategy_id', strategyId)
          .eq('user_id', userId)
          .order('date', { ascending: false }),`,
`        applyAccountFilter(
          supabase
            .from('trades')
            .select('id, date, symbol, direction, option_type, pnl, r_multiple, status, execution_status, holding_time_mins')
            .eq('strategy_id', strategyId)
            .eq('user_id', userId)
            .order('date', { ascending: false }),
          activeAccount
        ),`
);

// 4. Client-side adherence filtering
replace(
`        if (adherError) throw adherError;
        setAdherences((adherData as AdherenceItem[]) || []);`,
`        if (adherError) throw adherError;
        
        // Client-side filter rule adherences to match only the fetched trades (which are account-filtered)
        const validTradeIds = new Set(tradesRes.data?.map((t: any) => t.id) || []);
        const filteredAdherences = (adherData as AdherenceItem[] || []).filter((a: any) => validTradeIds.has(a.trade_id));
        setAdherences(filteredAdherences);`
);

// 5. Dependencies
replace(
`  useEffect(() => {
    fetchStrategyContext();
  }, [strategyId, userId]);`,
`  useEffect(() => {
    fetchStrategyContext();
  }, [strategyId, userId, activeAccount]);`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('StrategyDetail.tsx patched.');
