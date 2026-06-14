import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  PlusCircle,
  ScrollText,
  Target,
  BarChart2,
  Calendar,
  MessageCircle,
  Settings,
  LogOut,
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
    { icon: BarChart2, label: 'Trading Reports', route: '/reports' },
    { icon: Calendar, label: 'Annual Reports', route: '/annual-reports' },
    { icon: MessageCircle, label: 'AI Teacher', route: '/ai-teacher' },
    { icon: Settings, label: 'Settings', route: '/settings' },
  ];

  const sidebarContent = (
    <div 
      className="flex flex-col h-full font-sans"
      style={{ backgroundColor: 'var(--card)', borderRight: '1px solid var(--border)', color: 'var(--text)' }}
    >
      {/* Top logo section */}
      <div 
        className="px-6 py-6 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-lg tracking-tight shrink-0 shadow-lg"
            style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
          >
            T
          </div>
          <div>
            <div className="text-lg font-bold tracking-wider font-display" style={{ color: 'var(--text)' }}>TRADELYZE</div>
            <div className="text-[10px] italic font-mono uppercase tracking-tight" style={{ color: 'var(--text-muted)' }}>System Active</div>
          </div>
        </div>
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 bg-transparent rounded-lg cursor-pointer"
            style={{ color: 'var(--text-sub)' }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation items section */}
      <nav className="px-3 mt-6 flex-1 space-y-1.5 overflow-y-auto">
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
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl mx-1 cursor-pointer transition-all duration-200 text-sm font-medium"
              style={{
                backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-sub)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bar)';
                  e.currentTarget.style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-sub)';
                }
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User and Sign out section */}
      <div className="px-5 py-4 mt-auto" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--row)' }}>
        <div className="text-xs font-mono truncate px-1" style={{ color: 'var(--text-muted)' }} title={userEmail || ''}>
          {userEmail || 'trader@tradelyze.in'}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm mt-3 w-full px-1 py-1 cursor-pointer transition-colors"
          style={{ color: 'var(--text-sub)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-sub)'}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside 
        className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[250px] h-screen z-30"
        style={{ backgroundColor: 'var(--card)', borderRight: '1px solid var(--border)' }}
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
        className={`fixed inset-y-0 left-0 w-[250px] z-50 md:hidden shadow-2xl transition-transform duration-250 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--card)', borderRight: '1px solid var(--border)' }}
      >
        {sidebarContent}
      </div>
    </>
  );
};
