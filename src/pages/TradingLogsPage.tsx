import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import { Menu, Plus, Star, BarChart, AlertTriangle } from 'lucide-react';
import { Trade } from '../types';

export const TradingLogsPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Authenticated route safety
  useEffect(() => {
    if (!authLoading && !userId) {
      navigate('/login');
    }
  }, [userId, authLoading, navigate]);

  // Read logs database fetch query on mount/userId binding
  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    const fetchTradeHistoryLogs = async () => {
      try {
        setLoading(true);
        // GET all trades for trading logs
        const { data, error } = await supabase
          .from('trades')
          .select('*, strategies(name, type_of_strategy)')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (mounted && data) {
          setTrades(data as Trade[]);
        }
      } catch (err: any) {
        console.error('Error fetching trade history logs:', err);
        showError(err.message || 'Error occurred while loading transaction logs.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTradeHistoryLogs();

    return () => {
      mounted = false;
    };
  }, [userId]);

  // Formatting date helper, e.g. "15 Jun" or "15 Jun 2026"
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      return `${day} ${month}`;
    } catch {
      return dateStr;
    }
  };

  // Indian Rupees Local Currency Formatter (plain decimal in database to Indian Lakhs format)
  const formatINR = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    const prefix = val < 0 ? '-₹' : '₹';
    return `${prefix}${Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Direction formatting elements
  const renderDirectionBadge = (dir: string | null) => {
    if (!dir) return <span className="text-zinc-600 italic">—</span>;
    let style = '';
    if (dir === 'CALL') style = 'text-green-400 bg-green-950/40 border border-green-800/50';
    if (dir === 'PUT') style = 'text-red-400 bg-red-950/40 border border-red-800/50';
    if (dir === 'LONG') style = 'text-blue-400 bg-blue-950/40 border border-blue-800/50';
    if (dir === 'SHORT') style = 'text-purple-400 bg-purple-950/40 border border-purple-800/50';

    return (
      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${style}`}>
        {dir}
      </span>
    );
  };

  // Status Badge mappings
  const renderStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-zinc-600">—</span>;
    if (status === 'Win') {
      return (
        <span className="px-2.5 py-1 text-xs font-extrabold bg-green-950/80 border border-green-700/80 text-green-300 rounded-lg">
          WIN
        </span>
      );
    }
    if (status === 'Loss') {
      return (
        <span className="px-2.5 py-1 text-xs font-extrabold bg-red-950/80 border border-red-700/80 text-red-300 rounded-lg">
          LOSS
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-extrabold bg-zinc-800 border border-zinc-650 text-zinc-300 rounded-lg">
        BE
      </span>
    );
  };

  // Execution Badge mapping
  const renderExecutionBadge = (exec: string | null) => {
    if (!exec) return <span className="text-zinc-600 italic">—</span>;
    let style = '';
    let label = 'AVG';
    if (exec === 'BEST TRADE') {
      style = 'bg-green-950/60 text-green-400 border border-green-800/80';
      label = 'BEST';
    } else if (exec === 'GOOD TRADE') {
      style = 'bg-teal-950/60 text-teal-400 border border-teal-800/80';
      label = 'GOOD';
    } else if (exec === 'AVERAGE TRADE') {
      style = 'bg-amber-950/60 text-amber-400 border border-amber-800/80';
      label = 'AVG';
    } else if (exec === 'POOR TRADE') {
      style = 'bg-orange-950/60 text-orange-400 border border-orange-850';
      label = 'POOR';
    } else if (exec === 'BAD TRADE') {
      style = 'bg-red-950/60 text-red-400 border border-red-850';
      label = 'BAD';
    }

    return (
      <span className={`px-2 py-0.5 text-[10px] uppercase font-mono tracking-wide font-extrabold rounded-md ${style}`}>
        {label}
      </span>
    );
  };

  // Mistake rendering format
  const renderMistakeCell = (type: string | null) => {
    if (!type || type === 'No Mistake') {
      return <span className="text-zinc-600 italic">None</span>;
    }
    return <span className="text-zinc-400 text-xs font-medium truncate max-w-[120px] block">{type}</span>;
  };

  // Stars rendering
  const renderRatingStars = (rating: number | null) => {
    if (!rating || rating <= 0) return <span className="text-zinc-600">—</span>;
    return (
      <span className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-3 h-3 fill-current" />
        ))}
      </span>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT MAIN CONTAINER */}
      <div className="flex-1 md:pl-[250px] flex flex-col min-h-screen">
        {/* MOBILE HEADER BAR */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 md:hidden bg-zinc-900 sticky top-0 z-20">
          <div className="text-xl font-bold text-indigo-400 tracking-wider font-display">TRADELYZE</div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* CONTAINER CONTENT */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            {/* PAGE HEADER ROW */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 font-display">
                  Trading Logs
                </h1>
                <p className="text-sm text-zinc-400 mt-1.5">
                  View and audit your logged transactions history and setup matches.
                </p>
              </div>
              <div>
                <Link
                  to="/trade-entry"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-indigo-600/10 cursor-pointer inline-flex items-center gap-1.5 font-display"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log New Trade</span>
                </Link>
              </div>
            </div>

            <div className="border-b border-zinc-800/80 mt-5 mb-8" />

            {/* ERROR SKELETON OR RESULTS TABLE */}
            {loading ? (
              <div className="rounded-2xl overflow-hidden border border-zinc-850">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-800/80 text-xs font-mono font-extrabold text-zinc-500 uppercase tracking-widest">
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Symbol</th>
                      <th className="px-4 py-3.5">Dir</th>
                      <th className="px-4 py-3.5">Setup</th>
                      <th className="px-4 py-3.5">P&L</th>
                      <th className="px-4 py-3.5 hidden md:table-cell">R</th>
                      <th className="px-4 py-3.5 hidden md:table-cell">Status</th>
                      <th className="px-4 py-3.5 hidden md:table-cell">Execution</th>
                      <th className="px-4 py-3.5 hidden md:table-cell">Mistakes</th>
                      <th className="px-4 py-3.5 hidden md:table-cell">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <tr key={idx} className="border-t border-zinc-800/60 bg-zinc-900/40 animate-pulse">
                        <td className="px-4 py-4"><div className="h-4 bg-zinc-800 rounded-lg w-12" /></td>
                        <td className="px-4 py-4"><div className="h-4 bg-zinc-800 rounded-lg w-16" /></td>
                        <td className="px-4 py-4"><div className="h-4 bg-zinc-800 rounded-lg w-8" /></td>
                        <td className="px-4 py-4"><div className="h-4 bg-zinc-800 rounded-lg w-24" /></td>
                        <td className="px-4 py-4"><div className="h-4 bg-zinc-800 rounded-lg w-16" /></td>
                        <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded-lg w-8" /></td>
                        <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded-lg w-12" /></td>
                        <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded-lg w-12" /></td>
                        <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded-lg w-16" /></td>
                        <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded-lg w-12" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : trades.length === 0 ? (
              /* EMPTY STATE UNIT CARD */
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center py-16 shadow-2xl">
                <div className="w-16 h-16 bg-zinc-950/60 rounded-full flex items-center justify-center border border-zinc-800/80 mb-4">
                  <BarChart className="w-8 h-8 text-zinc-650" />
                </div>
                <h3 className="text-xl font-bold text-zinc-200 font-display">No Trades Logged Yet</h3>
                <p className="text-zinc-500 text-sm mt-2 max-w-sm">
                  Log your first trade to activate your journal dashboard and compile performance analytics.
                </p>
                <Link
                  to="/trade-entry"
                  className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-5 py-3 text-xs uppercase tracking-widest font-mono transition-all inline-flex items-center gap-1.5"
                >
                  <span>Log New Trade</span>
                  <Plus className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              /* RESULTS TABLE DESKTOP / MOBILE */
              <div className="rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-zinc-800/80 text-[10px] font-mono font-extrabold text-zinc-500 uppercase tracking-widest">
                        <th className="px-4 py-4">Date</th>
                        <th className="px-4 py-4">Symbol</th>
                        <th className="px-4 py-4 hidden md:table-cell">Dir</th>
                        <th className="px-4 py-4 hidden md:table-cell">Setup</th>
                        <th className="px-4 py-4">P&L</th>
                        <th className="px-4 py-4 hidden md:table-cell">R</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4 hidden md:table-cell">Execution</th>
                        <th className="px-4 py-4 hidden md:table-cell">Mistakes</th>
                        <th className="px-4 py-4 hidden md:table-cell col-span-1">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((item) => {
                        const hasProfit = item.pnl !== null && item.pnl > 0;
                        const hasLoss = item.pnl !== null && item.pnl < 0;

                        return (
                          <tr
                            key={item.id}
                            className="border-t border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-800/30 transition-colors text-sm font-sans"
                          >
                            {/* Date formatted */}
                            <td className="px-4 py-4.5 whitespace-nowrap">
                              <span className="text-zinc-400 font-mono text-xs font-semibold">
                                {formatDateLabel(item.date)}
                              </span>
                            </td>

                            {/* Symbol text-white */}
                            <td className="px-4 py-4.5 whitespace-nowrap">
                              <span className="text-zinc-100 font-bold font-mono tracking-wide">
                                {item.symbol}
                              </span>
                            </td>

                            {/* Direction pill hidden below md */}
                            <td className="px-4 py-4.5 whitespace-nowrap hidden md:table-cell">
                              {renderDirectionBadge(item.call_put)}
                            </td>

                            {/* Setup selection strategy schema name */}
                            <td className="px-4 py-4.5 whitespace-nowrap hidden md:table-cell">
                              {item.strategies?.name ? (
                                <span className="text-zinc-200 font-medium font-mono text-xs">
                                  {item.strategies.name}
                                </span>
                              ) : (
                                <span className="text-zinc-650 italic font-mono text-xs">
                                  No Setup
                                </span>
                              )}
                            </td>

                            {/* Pnl en-IN currency */}
                            <td className="px-4 py-4.5 whitespace-nowrap">
                              <span
                                className={`font-mono font-extrabold ${
                                  hasProfit ? 'text-green-400' : hasLoss ? 'text-red-400' : 'text-zinc-400'
                                }`}
                              >
                                {formatINR(item.pnl)}
                              </span>
                            </td>

                            {/* R Multiple formatting */}
                            <td className="px-4 py-4.5 whitespace-nowrap hidden md:table-cell">
                              {item.r_multiple !== null ? (
                                <span
                                  className={`font-mono font-bold text-xs ${
                                    item.r_multiple > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}
                                >
                                  {item.r_multiple > 0 ? '+' : ''}
                                  {item.r_multiple.toFixed(2)}R
                                </span>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>

                            {/* WIN/LOSS/BE Badge */}
                            <td className="px-4 py-4.5 whitespace-nowrap">
                              {renderStatusBadge(item.status)}
                            </td>

                            {/* Execution quality */}
                            <td className="px-4 py-4.5 whitespace-nowrap hidden md:table-cell">
                              {renderExecutionBadge(item.execution_status)}
                            </td>

                            {/* Mistakes description type */}
                            <td className="px-4 py-4.5 whitespace-nowrap hidden md:table-cell">
                              {renderMistakeCell(item.mistake_type)}
                            </td>

                            {/* Rating Stars render */}
                            <td className="px-4 py-4.5 whitespace-nowrap hidden md:table-cell">
                              {renderRatingStars(item.trade_rating)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
