import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import OnboardingPage from './pages/OnboardingPage';
import SettingsPage from './pages/SettingsPage';
import RiskCalculatorPage from './pages/RiskCalculatorPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { StrategyDetail } from './pages/StrategyDetail';
import { StrategyBuilderPage } from './pages/StrategyBuilderPage';
import { TradeEntryPage } from './pages/TradeEntryPage';
import { TradingLogsPage } from './pages/TradingLogsPage';
import { TradeTrackingPage } from './pages/TradeTrackingPage';
import { DashboardPage } from './pages/DashboardPage';
import { DailyJournal } from './pages/DailyJournal';
import { TradingReportsPage } from './pages/TradingReportsPage';
import { AnnualReportsPage } from './pages/AnnualReportsPage';
import { AdvancedReports } from './pages/AdvancedReports';
import { AiTeacherPage } from './pages/AiTeacherPage';
import { Notebook } from './pages/Notebook';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { useTheme } from './hooks/useTheme';
import { useAuth, AuthProvider } from './hooks/useAuth';

function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center font-sans" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}

function AuthenticatedLayout() {
  const { user, userData, loading, trialExpired } = useAuth();
  const location = useLocation();
  const [accountClosed, setAccountClosed] = React.useState(false);

  React.useEffect(() => {
    if (userData && userData.is_deleted === true && !accountClosed) {
      setAccountClosed(true);
      supabase.auth.signOut();
    }
  }, [userData, accountClosed]);

  if (accountClosed) {
    return (
      <div className="min-h-dvh flex items-center justify-center font-sans animate-none" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <p className="text-lg font-medium opacity-80">This account has been permanently closed.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center font-sans animate-none" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Onboarding enforcement redirect
  if (userData && userData.onboarding_completed === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Gentle subscription enforcement redirect (settings and pricing always accessible)
  if (trialExpired && 
      location.pathname !== '/settings' && 
      location.pathname !== '/pricing') {
    return <Navigate to="/settings?tab=subscription" replace />;
  }

  return (
    <div className="flex flex-col min-h-dvh w-full font-sans">
      <div className="flex-1 flex flex-col w-full">
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  useTheme();
  return (
    <ToastProvider>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Public placeholder routes */}
            <Route path="/products/journal" element={<ComingSoonPage title="Trading Journal" />} />
            <Route path="/products/analytics" element={<ComingSoonPage title="Reports & Analytics" />} />
            <Route path="/products/playbooks" element={<ComingSoonPage title="Strategy Playbooks" />} />
            <Route path="/products/pattern-match" element={<ComingSoonPage title="Visual Pattern Match" />} />
            <Route path="/products/ai-teacher" element={<ComingSoonPage title="AI Teacher" />} />
            
            <Route path="/solutions/beginners" element={<ComingSoonPage title="For Beginner Traders" />} />
            <Route path="/solutions/developing" element={<ComingSoonPage title="For Developing Traders" />} />
            <Route path="/solutions/profitable" element={<ComingSoonPage title="For Profitable Traders" />} />
            <Route path="/solutions/ict-communities" element={<ComingSoonPage title="For ICT Communities" />} />
            
            <Route path="/supported-brokers" element={<ComingSoonPage title="Supported Brokers" />} />
            
            <Route path="/resources/blog" element={<ComingSoonPage title="Blog" />} />
            <Route path="/resources/changelog" element={<ComingSoonPage title="Changelog" />} />
            <Route path="/resources/community" element={<ComingSoonPage title="Community" />} />

            {/* Authenticated routes wrapper */}
            <Route element={<AuthenticatedLayout />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
              
              {/* Strategies setup dashboard */}
              <Route path="/strategies" element={<StrategiesPage />} />
              <Route path="/strategies/:id" element={<StrategyDetail />} />
              <Route path="/strategies/new" element={<StrategyBuilderPage />} />
              <Route path="/strategies/:id/edit" element={<StrategyBuilderPage />} />

              {/* Performance metrics dashboard */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/daily-journal" element={<DailyJournal />} />
              <Route path="/trade-entry" element={<TradeEntryPage />} />
              <Route path="/trade-entry/:id" element={<TradeEntryPage />} />
              
              {/* Trading Logs Routing */}
              <Route path="/trading-logs" element={<TradingLogsPage />} />
              <Route path="/trading-logs/:id" element={<TradeTrackingPage />} />
              <Route path="/trade-tracking/:id" element={<TradeTrackingPage />} />
              <Route path="/trade/:id" element={<TradeTrackingPage />} />
              <Route path="/logs" element={<Navigate to="/trading-logs" replace />} />

              {/* Other Authenticated Pages */}
              <Route path="/notebook" element={<Notebook />} />
              <Route path="/advanced-reports" element={<AdvancedReports />} />
              <Route path="/reports" element={<Navigate to="/advanced-reports" replace />} />
              <Route path="/annual-reports" element={<AnnualReportsPage />} />
              <Route path="/ai-teacher" element={<AiTeacherPage />} />
              
              {/* Risk Calculator replaces generic placeholder page */}
              <Route path="/risk-calculator" element={<RiskCalculatorPage />} />
              
              {/* Settings replaces generic placeholder page */}
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Wildcard Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
      <ToastContainer />
    </ToastProvider>
  );
}
