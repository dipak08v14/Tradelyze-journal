import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { TrialBanner } from './TrialBanner';
import {
  LayoutDashboard,
  PlusCircle,
  ScrollText,
  Target,
  BarChart2,
  Calendar,
  MessageCircle,
  Settings,
  Calculator,
  X
} from 'lucide-react';

interface SidebarProps {
  userEmail: string | null;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ userEmail, mobileOpen, setMobileOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, daysRemaining, trialExpired } = useAuth();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', route: '/dashboard' },
    { icon: PlusCircle, label: 'Trade Entry', route: '/trade-entry' },
    { icon: ScrollText, label: 'Trading Logs', route: '/trading-logs' },
    { icon: Target, label: 'Strategies', route: '/strategies' },
    { icon: PlusCircle, label: 'Strategy Builder', route: '/strategies/new' },
    { icon: BarChart2, label: 'Monthly Reports', route: '/reports' },
    { icon: Calendar, label: 'Annual Reports', route: '/annual-reports' },
    { icon: MessageCircle, label: 'AI Teacher', route: '/ai-teacher' },
    { icon: Calculator, label: 'Risk Calculator', route: '/risk-calculator' },
    { icon: Settings, label: 'Settings', route: '/settings' },
  ];

  const sidebarContent = (
    <div 
      className="flex flex-col h-full font-sans"
      style={{ 
        backgroundColor: 'var(--topbar)', 
        borderRight: '0.5px solid var(--border)', 
        color: 'var(--text)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {/* Top logo section */}
      <div className="flex flex-col gap-2" style={{ padding: '20px 16px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '1px', color: 'var(--accent)', fontFamily: 'Inter, sans-serif' }}>
            TRADELYZE
          </span>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1 bg-transparent rounded-lg cursor-pointer"
              style={{ color: 'var(--text-sub)' }}
              aria-label="Close menu"
            >
              <X className="w-5 h-5 animate-none" />
            </button>
          )}
        </div>
        
        {/* current month pill */}
        <div className="self-start">
          <span style={{ 
            backgroundColor: 'var(--accent-muted)', 
            color: 'var(--accent)', 
            fontSize: '11px', 
            fontWeight: '600', 
            borderRadius: '999px', 
            padding: '3px 10px',
            display: 'inline-block'
          }}>
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Navigation items section */}
      <nav className="flex-1 space-y-1 overflow-y-auto" style={{ padding: '8px' }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.route || 
            (item.route === '/strategies' && location.pathname.startsWith('/strategies')) ||
            (item.route === '/trading-logs' && location.pathname.startsWith('/trading-logs'));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.route}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 cursor-pointer"
              style={{
                padding: '8px 12px',
                borderRadius: '7px',
                fontSize: '13px',
                fontWeight: '500',
                backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-sub)',
                transition: 'all 120ms ease-in-out',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bar)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Trial Banner above footer container */}
      <TrialBanner 
        subscriptionPlan={userData?.subscription_plan} 
        daysRemaining={daysRemaining} 
        trialExpired={trialExpired} 
      />

      {/* User and Sign out section */}
      <div className="px-5 py-4 mt-auto" style={{ borderTop: '0.5px solid var(--border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="truncate" title={userEmail || ''}>
          {userEmail || 'trader@tradelyze.in'}
        </div>
        <button
          onClick={handleSignOut}
          className="bg-transparent border-none p-0 mt-2 cursor-pointer text-left font-medium hover:opacity-80 transition-opacity"
          style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)',
            display: 'block'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside 
        className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[220px] h-screen z-30"
        style={{ backgroundColor: 'var(--topbar)', borderRight: '0.5px solid var(--border)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden transition-opacity backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-[220px] z-50 md:hidden shadow-2xl transition-transform duration-250 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--topbar)', borderRight: '0.5px solid var(--border)' }}
      >
        {sidebarContent}
      </div>
    </>
  );
};
