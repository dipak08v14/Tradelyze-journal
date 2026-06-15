import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
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
import { StrategyBuilderPage } from './pages/StrategyBuilderPage';
import { TradeEntryPage } from './pages/TradeEntryPage';
import { TradingLogsPage } from './pages/TradingLogsPage';
import { TradeTrackingPage } from './pages/TradeTrackingPage';
import { DashboardPage } from './pages/DashboardPage';
import { TradingReportsPage } from './pages/TradingReportsPage';
import { AnnualReportsPage } from './pages/AnnualReportsPage';
import { AiTeacherPage } from './pages/AiTeacherPage';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';

function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans animate-none" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
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
    <div className="flex flex-col min-h-screen w-full font-sans">
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
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomeRoute />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated routes wrapper */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            
            {/* Strategies setup dashboard */}
            <Route path="/strategies" element={<StrategiesPage />} />
            <Route path="/strategies/new" element={<StrategyBuilderPage />} />
            <Route path="/strategies/:id/edit" element={<StrategyBuilderPage />} />

            {/* Performance metrics dashboard */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trade-entry" element={<TradeEntryPage />} />
            <Route path="/trade-entry/:id" element={<TradeEntryPage />} />
            
            {/* Trading Logs Routing */}
            <Route path="/trading-logs" element={<TradingLogsPage />} />
            <Route path="/trading-logs/:id" element={<TradeTrackingPage />} />
            <Route path="/logs" element={<Navigate to="/trading-logs" replace />} />

            {/* Other Authenticated Pages */}
            <Route path="/reports" element={<TradingReportsPage />} />
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
      </Router>
      <ToastContainer />
    </ToastProvider>
  );
}
