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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 20px 16px 20px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <svg width="36" height="34" viewBox="0 0 108 102" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00c6ff"/>
                <stop offset="100%" stopColor="#0072ff"/>
              </linearGradient>
            </defs>
            <path d="M16 21h45.5l-3.5 11.5H41v40H26.5v-40H16Z" fill="url(#tGrad)"/>
            <path d="M65.5 21H96L61 61h35v11.5H57.5L92.5 32.5H62L65.5 21" fill="#0f172a"/>
          </svg>
          <span style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '0.8px', color: 'var(--accent)', lineHeight: '1' }}>TRADELYZE</span>
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
      <nav className="px-3 flex-1 space-y-1.5 overflow-y-auto">
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
