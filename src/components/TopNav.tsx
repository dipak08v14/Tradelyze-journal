import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    }
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  const currentMonthYear = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });

  // Compute User Initials
  const userMetadata = user.user_metadata || {};
  const fullName = userMetadata.full_name || '';
  let initials = '';
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1) {
      initials = parts[0].slice(0, 2).toUpperCase();
    }
  }
  if (!initials && user.email) {
    initials = user.email.slice(0, 2).toUpperCase();
  }
  initials = initials || 'U';

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const navItems = [
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Trade Entry', route: '/trade-entry' },
    { label: 'Trade Logs', route: '/trading-logs' },
    { label: 'Strategies', route: '/strategies' },
    { label: 'Reports', route: '/reports' },
    { label: 'AI Teacher', route: '/ai-teacher' },
    { label: 'Risk Calculator', route: '/risk-calculator' }
  ];

  return (
    <div
      style={{
        height: '52px',
        backgroundColor: 'var(--topbar)',
        borderBottom: '0.5px solid var(--border)',
        paddingLeft: '24px',
        paddingRight: '24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Left side: Logo */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '0.8px',
            color: 'var(--accent)',
            marginRight: '32px',
            userSelect: 'none'
          }}
        >
          <svg width="22" height="20" viewBox="0 0 108 102" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="topnavGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <path d="M16 21h45.5l-3.5 11.5H41v40H26.5v-40H16Z" fill="url(#topnavGrad)" />
            <path d="M65 21h14.5L67.8 61H96l-3.5 11.5H50Z" fill="var(--text)" />
          </svg>
          TRADELYZE
        </div>

        {/* Center: Navigation Links */}
        <nav style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.route ||
              (item.route === '/strategies' && location.pathname.startsWith('/strategies')) ||
              (item.route === '/trading-logs' && location.pathname.startsWith('/trading-logs'));

            return (
              <Link
                key={item.label}
                to={item.route}
                className="tl-nav-item"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: isActive ? 'var(--accent)' : 'var(--text-sub)',
                  backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                  padding: '5px 12px',
                  borderRadius: '7px',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  border: 'none',
                  outline: 'none',
                  transition: 'all 120ms ease',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right side: Month Badge and Avatar Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Month badge */}
        <div
          style={{
            backgroundColor: 'var(--accent-muted)',
            color: 'var(--accent)',
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: '999px',
            whiteSpace: 'nowrap'
          }}
        >
          {currentMonthYear}
        </div>

        {/* User avatar circle and dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-muted)',
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              outline: 'none'
            }}
          >
            {initials}
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '42px',
                right: 0,
                backgroundColor: 'var(--card)',
                border: '0.5px solid var(--border)',
                borderRadius: '8px',
                padding: '6px',
                width: '120px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
                className="tl-dropdown-item"
                style={{
                  fontSize: '13px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'background-color 100ms'
                }}
              >
                Settings
              </div>
              <div
                onClick={handleSignOut}
                className="tl-dropdown-item"
                style={{
                  fontSize: '13px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'background-color 100ms'
                }}
              >
                Sign Out
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Style overrides for hover effect inside JS */}
      <style>{`
        .tl-nav-item:hover {
          background-color: var(--bar) !important;
        }
        .tl-dropdown-item:hover {
          background-color: var(--bar) !important;
        }
      `}</style>
    </div>
  );
}
