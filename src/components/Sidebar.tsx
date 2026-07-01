import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { TrialBanner } from './TrialBanner';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  ScrollText,
  Target,
  BarChart2,
  TrendingUp,
  Calendar,
  MessageCircle,
  Settings,
  Calculator,
  X,
  Book
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
    { icon: BookOpen, label: 'Daily Journal', route: '/daily-journal' },
    { icon: ScrollText, label: 'Trading Logs', route: '/trading-logs' },
    { icon: TrendingUp, label: 'Reports', route: '/advanced-reports' },
    { icon: BarChart2, label: 'Monthly Reports', route: '/reports' },
    { icon: Calendar, label: 'Annual Reports', route: '/annual-reports' },
    { icon: Target, label: 'Strategies', route: '/strategies' },
    { icon: Book, label: 'Notebook', route: '/notebook' },
    { icon: Calculator, label: 'Risk Calculator', route: '/risk-calculator' },
    { icon: MessageCircle, label: 'AI Teacher', route: '/ai-teacher' },
    { icon: Settings, label: 'Settings', route: '/settings' },
  ];

  const sidebarContent = (
    <div 
      className="flex flex-col h-full min-h-0 font-sans"
      style={{ 
        backgroundColor: 'var(--topbar)', 
        borderRight: '1px solid rgba(0, 0, 0, 0.08)', 
        boxShadow: '1px 0 3px rgba(0, 0, 0, 0.04)',
        color: 'var(--text)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {/* Top logo section */}
      <div 
        id="sidebar-logo-wrapper"
        style={{ 
          padding: '20px 16px 16px 16px', 
          borderBottom: '1px solid var(--border)', 
          display: 'block',
          position: 'relative'
        }}
      >
        <span 
          id="sidebar-brand-text"
          style={{ 
            fontSize: '22px', 
            fontWeight: 900, 
            color: 'var(--text)', 
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap'
          }}
        >
          TRADELYZE
        </span>
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 bg-transparent rounded-lg cursor-pointer absolute"
            style={{ 
              color: 'var(--text-sub)',
              top: '20px',
              right: '16px'
            }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5 animate-none" />
          </button>
        )}
      </div>

      {/* Prominent "+ Add Trade" CTA button */}
      <button
        onClick={() => {
          navigate('/trade-entry');
          setMobileOpen(false);
        }}
        style={{
          width: 'calc(100% - 32px)',
          height: '34px',
          backgroundColor: 'var(--accent)',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          margin: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 120ms ease'
        }}
        className="hover:brightness-[0.92] shrink-0"
      >
        + Add Trade
      </button>

      {/* Navigation items section */}
      <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto" style={{ padding: '0px 8px 8px 8px' }}>
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
              className="flex items-center gap-3 cursor-pointer sidebar-nav-link"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                margin: '2px 8px',
                fontSize: '13px',
                fontWeight: isActive ? '600' : '500',
                backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text)',
                transition: 'background 120ms ease',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
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
      <div className="px-4 py-3 mt-auto" style={{ borderTop: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'var(--accent-muted)', color: 'var(--accent)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {(userEmail || 'T')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }} className="truncate" title={userEmail || ''}>
              {userEmail || 'trader@tradelyze.in'}
            </div>
            <button onClick={handleSignOut} className="bg-transparent border-none p-0 cursor-pointer text-left hover:opacity-70 transition-opacity" style={{ fontSize: '11px', color: 'var(--text-sub)', display: 'block', marginTop: '1px' }}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside 
        className="hidden md:flex flex-col w-[220px] h-screen sticky top-0 overflow-y-hidden flex-shrink-0"
        style={{ backgroundColor: 'var(--topbar)', borderRight: '1px solid rgba(0, 0, 0, 0.08)', boxShadow: '1px 0 3px rgba(0, 0, 0, 0.04)' }}
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
        style={{ backgroundColor: 'var(--topbar)', borderRight: '1px solid rgba(0, 0, 0, 0.08)', boxShadow: '1px 0 3px rgba(0, 0, 0, 0.04)' }}
      >
        {sidebarContent}
      </div>
    </>
  );
};
