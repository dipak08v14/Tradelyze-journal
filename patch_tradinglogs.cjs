const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'TradingLogsPage.tsx');
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
`export const TradingLogsPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();`,
`export const TradingLogsPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const { activeAccount } = useActiveAccount();`
);

// 3. fetchFilterOptions
replace(
`      const { data: tradesData } = await supabase
        .from('trades')
        .select('year')
        .eq('user_id', userId);

      const yearsSet = new Set<number>();`,
`      let tradesQuery = supabase
        .from('trades')
        .select('year')
        .eq('user_id', userId);

      tradesQuery = applyAccountFilter(tradesQuery, activeAccount);

      const { data: tradesData } = await tradesQuery;

      const yearsSet = new Set<number>();`
);

replace(
`  useEffect(() => {
    if (userId) {
      fetchFilterOptions();
    }
  }, [userId]);`,
`  useEffect(() => {
    if (userId) {
      fetchFilterOptions();
    }
  }, [userId, activeAccount]);`
);

// 4. applyFiltersToQuery
replace(
`  // Apply filters helper to standard query
  const applyFiltersToQuery = (query: any) => {
    if (filterMonth !== 'All') {`,
`  // Apply filters helper to standard query
  const applyFiltersToQuery = (query: any) => {
    query = applyAccountFilter(query, activeAccount);
    if (filterMonth !== 'All') {`
);

// 5. fetchTradesData dependency array
replace(
`    tradesPerPage,
    sortColumn,
    sortDirection
  ]);`,
`    tradesPerPage,
    sortColumn,
    sortDirection,
    activeAccount
  ]);`
);

// 6. Pagination reset dependency array
replace(
`    filterMistakeType,
    filterNeedsReview,
    tradesPerPage
  ]);`,
`    filterMistakeType,
    filterNeedsReview,
    tradesPerPage,
    activeAccount
  ]);`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('TradingLogsPage patched.');
