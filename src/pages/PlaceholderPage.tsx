import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sidebar } from '../components/Sidebar';
import { Menu, Hourglass, ArrowLeft } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  message: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, message }) => {
  const { user, userId, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
        {/* MOBILE TOPBAR header */}
        <header 
          className="flex items-center justify-between px-6 py-4 md:hidden sticky top-0 z-20"
          style={{ backgroundColor: 'var(--topbar)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="text-xl font-bold tracking-wider font-display" style={{ color: 'var(--accent)' }}>TRADELYZE</div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg cursor-pointer"
            style={{ color: 'var(--text-sub)' }}
            aria-label="Open navigation"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* CONTAINER FOR VIEWS */}
        <div className="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col justify-center items-center w-full">
          <div 
            className="rounded-3xl shadow-2xl p-8 max-w-md w-full text-center flex flex-col items-center"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            {/* ICON COMPONENT */}
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ backgroundColor: 'var(--accent-muted)', border: '1px solid var(--border)' }}
            >
              <Hourglass className="w-8 h-8" style={{ color: 'var(--accent)' }} />
            </div>

            <h2 className="text-2xl font-bold mb-2 font-display" style={{ color: 'var(--text)' }}>{title}</h2>
            <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-sub)' }}>{message}</p>

            <Link
              to="/strategies"
              className="inline-flex items-center gap-2 group font-semibold text-sm transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              <span>Return to Strategies</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
