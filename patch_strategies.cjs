const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'StrategiesPage.tsx');
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
`export const StrategiesPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();`,
`export const StrategiesPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const { activeAccount } = useActiveAccount();
  const navigate = useNavigate();`
);

// 3. trades Query
replace(
`        supabase
          .from('trades')
          .select('id, strategy_id, pnl, r_multiple, status')
          .eq('user_id', userId),`,
`        applyAccountFilter(
          supabase
            .from('trades')
            .select('id, strategy_id, pnl, r_multiple, status')
            .eq('user_id', userId),
          activeAccount
        ),`
);

// 4. Dependencies
replace(
`  useEffect(() => {
    fetchAllData();
  }, [userId]);`,
`  useEffect(() => {
    fetchAllData();
  }, [userId, activeAccount]);`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('StrategiesPage.tsx patched.');
