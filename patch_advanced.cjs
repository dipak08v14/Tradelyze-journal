const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'AdvancedReports.tsx');
let content = fs.readFileSync(filePath, 'utf-8');
content = content.replace(/\r\n/g, '\n'); // Normalize line endings

function replace(target, replacement) {
    if (!content.includes(target)) {
        console.warn("Could not find target:", target.substring(0, 50));
    } else {
        content = content.replace(target, replacement);
        console.log("Replaced target:", target.substring(0, 50));
    }
}

// 1. Import
replace(
`import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';`,
`import { useToast } from '../hooks/useToast';
import { useActiveAccount, applyAccountFilter } from '../hooks/useActiveAccount';
import { Sidebar } from '../components/Sidebar';`
);

// 2. Extract activeAccount
replace(
`export const AdvancedReports: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError } = useToast();`,
`export const AdvancedReports: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError } = useToast();
  const { activeAccount } = useActiveAccount();`
);

// 3. fetchReportData Query
replace(
`        try {
          setLoading(true);
  
          const [tradesRes, psychRes, riskRes, rulesRes] = await Promise.all([
            supabase
              .from('trades')
              .select('*, strategies(name, type_of_strategy)')
              .eq('user_id', userId)
              .gte('date', fromDate)
              .lte('date', toDate)
              .order('date', { ascending: true }),
            supabase
              .from('trade_psychology')`,
`        try {
          setLoading(true);
  
          let tradesQuery = supabase
            .from('trades')
            .select('*, strategies(name, type_of_strategy)')
            .eq('user_id', userId)
            .gte('date', fromDate)
            .lte('date', toDate)
            .order('date', { ascending: true });
            
          tradesQuery = applyAccountFilter(tradesQuery, activeAccount);

          const [tradesRes, psychRes, riskRes, rulesRes] = await Promise.all([
            tradesQuery,
            supabase
              .from('trade_psychology')`
);

// 4. fetchReportData Dependencies
replace(
`      selectedStrategy,
      selectedMistake
    ]);`,
`      selectedStrategy,
      selectedMistake,
      activeAccount
    ]);`
);

// 5. Client-side filtering
replace(
`          if (fetchedTrades.length === 0) {
            setTrades([]);
            setPsychologyData([]);
            setComplianceRiskData([]);
            setRulesData([]);
          } else {
            setTrades(fetchedTrades);
            setPsychologyData(psychRes.data || []);
            setComplianceRiskData(riskRes.data || []);
            setRulesData(rulesRes.data || []);
          }`,
`          if (fetchedTrades.length === 0) {
            setTrades([]);
            setPsychologyData([]);
            setComplianceRiskData([]);
            setRulesData([]);
          } else {
            setTrades(fetchedTrades);
            
            // Client-side filtering to align with selected account's trades
            const validTradeIds = new Set(fetchedTrades.map((t: any) => t.id));
            setPsychologyData((psychRes.data || []).filter((p: any) => validTradeIds.has(p.trade_id)));
            setComplianceRiskData((riskRes.data || []).filter((r: any) => validTradeIds.has(r.trade_id)));
            setRulesData((rulesRes.data || []).filter((r: any) => validTradeIds.has(r.trade_id)));
          }`
);

// 6. fetchCalendarData Query
replace(
`      const fetchCalendarData = async () => {
        try {
          const { data, error } = await supabase
            .from('trades')
            .select('*, strategies(name, type_of_strategy)')
            .eq('user_id', userId)
            .eq('year', calendarYear);
  
          if (error) throw error;`,
`      const fetchCalendarData = async () => {
        try {
          let calendarQuery = supabase
            .from('trades')
            .select('*, strategies(name, type_of_strategy)')
            .eq('user_id', userId)
            .eq('year', calendarYear);
            
          calendarQuery = applyAccountFilter(calendarQuery, activeAccount);
  
          const { data, error } = await calendarQuery;
  
          if (error) throw error;`
);

// 7. fetchCalendarData Dependencies
replace(
`      fetchCalendarData();
    }, [userId, calendarYear]);`,
`      fetchCalendarData();
    }, [userId, calendarYear, activeAccount]);`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('AdvancedReports patched.');
