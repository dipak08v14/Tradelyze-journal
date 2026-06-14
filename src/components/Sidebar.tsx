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
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 text-zinc-100 font-sans">
      {/* Top logo section */}
      <div className="px-6 py-6 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-extrabold text-lg text-white font-display tracking-tight shrink-0 shadow-lg shadow-indigo-600/20">
            T
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-100 tracking-wider font-display">TRADELYZE</div>
            <div className="text-[10px] text-zinc-500 italic font-mono uppercase tracking-tight">System Active</div>
          </div>
        </div>
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 bg-transparent text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
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
            (item.route === '/strategies' && location.pathname.startsWith('/strategies'));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.route}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl mx-1 cursor-pointer transition-all duration-200 text-sm font-medium ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-semibold'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User and Sign out section */}
      <div className="px-5 py-4 border-t border-zinc-800 mt-auto bg-zinc-950/20">
        <div className="text-zinc-500 text-xs font-mono truncate px-1" title={userEmail || ''}>
          {userEmail || 'trader@tradelyze.in'}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-zinc-400 hover:text-red-400 text-sm mt-3 w-full px-1 py-1 cursor-pointer transition-colors"
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
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[250px] bg-zinc-900 border-r border-zinc-800 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden transition-opacity backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-[250px] bg-zinc-900 z-50 md:hidden border-r border-zinc-800 shadow-2xl transition-transform duration-250 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
