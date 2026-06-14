import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Default redirections */}
          <Route path="/" element={<Navigate to="/strategies" replace />} />
          
          {/* Signin/Login portal */}
          <Route path="/login" element={<LoginPage />} />

          {/* Strategies setup dashboard */}
          <Route path="/strategies" element={<StrategiesPage />} />
          <Route path="/strategies/new" element={<StrategyBuilderPage />} />
          <Route path="/strategies/:id/edit" element={<StrategyBuilderPage />} />

          {/* Fully built performance metrics dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/trade-entry" element={<TradeEntryPage />} />
          <Route path="/trading-logs" element={<TradingLogsPage />} />
          <Route path="/trading-logs/:id" element={<TradeTrackingPage />} />
          <Route
            path="/reports"
            element={
              <PlaceholderPage
                title="Trading Reports"
                message="Monthly analytics and reports — Coming in Phase 6"
              />
            }
          />
          <Route
            path="/annual-reports"
            element={
              <PlaceholderPage
                title="Annual Reports"
                message="Year-by-year performance view — Coming in Phase 8"
              />
            }
          />
          <Route
            path="/ai-teacher"
            element={
              <PlaceholderPage
                title="AI Teacher"
                message="Ask Claude about your trading — Coming in Phase 7"
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

          {/* Wildcard Fallback */}
          <Route path="*" element={<Navigate to="/strategies" replace />} />
        </Routes>
      </Router>
      <ToastContainer />
    </ToastProvider>
  );
}
