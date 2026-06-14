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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans">
      {/* SIDEBAR */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 md:pl-[250px] flex flex-col min-h-screen">
        {/* MOBILE TOPBAR header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 md:hidden bg-zinc-900 sticky top-0 z-20">
          <div className="text-xl font-bold text-indigo-400 tracking-wider font-display">TRADELYZE</div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
            aria-label="Open navigation"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* CONTAINER FOR VIEWS */}
        <div className="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col justify-center items-center w-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center flex flex-col items-center">
            {/* ICON COMPONENT */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <Hourglass className="w-8 h-8 text-indigo-400" />
            </div>

            <h2 className="text-2xl font-bold text-zinc-100 mb-2 font-display">{title}</h2>
            <p className="text-sm text-zinc-450 leading-relaxed mb-8">{message}</p>

            <Link
              to="/strategies"
              className="inline-flex items-center gap-2 group text-indigo-400 hover:text-indigo-300 font-semibold text-sm transition-colors"
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
