import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { StrategyBuilderPage } from './pages/StrategyBuilderPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { TradeEntryPage } from './pages/TradeEntryPage';
import { TradingLogsPage } from './pages/TradingLogsPage';
import { TradeTrackingPage } from './pages/TradeTrackingPage';
import { DashboardPage } from './pages/DashboardPage';
import { TradingReportsPage } from './pages/TradingReportsPage';
import { AnnualReportsPage } from './pages/AnnualReportsPage';
import { AiTeacherPage } from './pages/AiTeacherPage';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { TopNav } from './components/TopNav';

function AuthenticatedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      <TopNav />
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
          {/* Default redirections */}
          <Route path="/" element={<Navigate to="/strategies" replace />} />
          
          {/* Signin/Login portal */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated routes wrapper */}
          <Route element={<AuthenticatedLayout />}>
            {/* Strategies setup dashboard */}
            <Route path="/strategies" element={<StrategiesPage />} />
            <Route path="/strategies/new" element={<StrategyBuilderPage />} />
            <Route path="/strategies/:id/edit" element={<StrategyBuilderPage />} />

            {/* Fully built performance metrics dashboard */}
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
            <Route
              path="/risk-calculator"
              element={
                <PlaceholderPage
                  title="Risk Calculator"
                  message="Risk Management and Capital Sizing Calculator — Coming in Phase 2"
                />
              }
            />
            <Route
              path="/settings"
              element={
                <PlaceholderPage
                  title="Settings"
                  message="Account and preferences — Coming in Phase 10"
                />
              }
            />
          </Route>

          {/* Wildcard Fallback */}
          <Route path="*" element={<Navigate to="/strategies" replace />} />
        </Routes>
      </Router>
      <ToastContainer />
    </ToastProvider>
  );
}

