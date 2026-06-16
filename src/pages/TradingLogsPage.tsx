import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import {
  Menu,
  Plus,
  Star,
  BarChart,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  X,
  TrendingUp
} from 'lucide-react';
import { Trade } from '../types';

export const TradingLogsPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter Needs Review State
  const [filterNeedsReview, setFilterNeedsReview] = useState<boolean>(false);

  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'needs_review') {
      setFilterNeedsReview(true);
    }
  }, [searchParams]);

  // General App & Navigation
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // States for Filter Parameters
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterSymbol, setFilterSymbol] = useState<string>('');
  const [filterSetup, setFilterSetup] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All'); // 'All' | 'Win' | 'Loss' | 'Breakeven'
  const [filterExecution, setFilterExecution] = useState<string>('All');
  const [filterMistakeType, setFilterMistakeType] = useState<string>('All');

  // Sorting State
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load Session Safety
  useEffect(() => {
    if (!authLoading && !userId) {
      navigate('/login');
    }
  }, [userId, authLoading, navigate]);

  // Fetch Trade Logs
  const fetchAllTradesData = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      let query = supabase
        .from('trades')
        .select('*, strategies(name, type_of_strategy)')
        .eq('user_id', userId);

      if (filterNeedsReview) {
        query = query.eq('needs_review', true);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setAllTrades(data as Trade[]);
      }
    } catch (err: any) {
      console.error('Error fetching trade history:', err);
      showError(err.message || 'Failed to sync your trades list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTradesData();
  }, [userId, filterNeedsReview]);

  // Dynamic values helper list from DB data (Unique setup names, years)
  const uniqueYears = useMemo(() => {
    const years = allTrades
      .map((t) => t.year)
      .filter((y): y is number => typeof y === 'number');
    const unique = Array.from(new Set(years)) as number[];
    return unique.sort((a, b) => b - a); // descending order
  }, [allTrades]);

  const uniqueSetups = useMemo(() => {
    const setups = allTrades
      .map((t) => t.strategies?.name)
      .filter((name): name is string => typeof name === 'string' && name !== '');
    return Array.from(new Set(setups)).sort();
  }, [allTrades]);

  // Filter Active Check
  const isFilterActive = useMemo(() => {
    return (
      filterMonth !== 'All' ||
      filterYear !== 'All' ||
      filterSymbol !== '' ||
      filterSetup !== 'All' ||
      filterStatus !== 'All' ||
      filterExecution !== 'All' ||
      filterMistakeType !== 'All' ||
      filterNeedsReview
    );
  }, [
    filterMonth,
    filterYear,
    filterSymbol,
    filterSetup,
    filterStatus,
    filterExecution,
    filterMistakeType,
    filterNeedsReview
  ]);

  // Reset Filters Function
  const handleResetFilters = () => {
    setFilterMonth('All');
    setFilterYear('All');
    setFilterSymbol('');
    setFilterSetup('All');
    setFilterStatus('All');
    setFilterExecution('All');
    setFilterMistakeType('All');
    setFilterNeedsReview(false);
    setSearchParams({});
  };

  // Perform filtering client-side
  const filteredTrades = useMemo(() => {
    return allTrades.filter((trade) => {
      // Month
      if (filterMonth !== 'All' && trade.month !== filterMonth) return false;
      // Year
      if (filterYear !== 'All' && trade.year?.toString() !== filterYear) return false;
      // Symbol
      if (filterSymbol.trim() !== '' && !trade.symbol.toUpperCase().includes(filterSymbol.toUpperCase().trim())) return false;
      // Setup / Strategy Name
      if (filterSetup !== 'All' && trade.strategies?.name !== filterSetup) return false;
      // Status
      if (filterStatus !== 'All' && trade.status !== filterStatus) return false;
      // Execution Status
      if (filterExecution !== 'All' && trade.execution_status !== filterExecution) return false;
      // Mistake Type
      if (filterMistakeType !== 'All' && trade.mistake_type !== filterMistakeType) return false;
      // Needs Review
      if (filterNeedsReview && !trade.needs_review) return false;

      return true;
    });
  }, [
    allTrades,
    filterMonth,
    filterYear,
    filterSymbol,
    filterSetup,
    filterStatus,
    filterExecution,
    filterMistakeType,
    filterNeedsReview
  ]);

  // Real-time Aggregated Stats based on FILTERED trades only
  const stats = useMemo(() => {
    const count = filteredTrades.length;
    let totalPnl = 0;
    let winCount = 0;
    let rankableCount = 0;
    let totalRisk = 0;
    let totalWinPnl = 0;
    let totalLossPnl = 0;

    filteredTrades.forEach((t) => {
      const p = t.pnl ? parseFloat(t.pnl as any) : 0;
      totalPnl += p;

      if (t.status === 'Win') {
        winCount++;
        totalWinPnl += p;
      } else if (t.status === 'Loss') {
        totalLossPnl += Math.abs(p);
      }

      if (t.status === 'Win' || t.status === 'Loss') {
        rankableCount++;
      }

      const r = t.risk ? parseFloat(t.risk as any) : 0;
      totalRisk += r;
    });

    const winRate = rankableCount > 0 ? (winCount / rankableCount) * 100 : 0;
    const avgR = count > 0 && totalRisk > 0 ? totalPnl / (totalRisk / count) : 0; // Note: simplified average R value or sum of R multiples can be computed
    
    // Average R-Multiple straight from storage
    let rSum = 0;
    let rCount = 0;
    filteredTrades.forEach((t) => {
      if (t.r_multiple !== null && t.r_multiple !== undefined) {
        rSum += parseFloat(t.r_multiple as any);
        rCount++;
      }
    });
    const calculatedAvgR = rCount > 0 ? rSum / rCount : 0;

    const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? Infinity : 0;

    return {
      count,
      totalPnl,
      winRate,
      avgR: calculatedAvgR,
      profitFactor
    };
  }, [filteredTrades]);

  // Sorting execution
  const sortedTrades = useMemo(() => {
    const data = [...filteredTrades];
    data.sort((a, b) => {
      let valA: any = a[sortColumn as keyof Trade];
      let valB: any = b[sortColumn as keyof Trade];

      // Handle null/undef
      if (valA === null || valA === undefined) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      if (valB === null || valB === undefined) {
        return sortDirection === 'asc' ? -1 : 1;
      }

      // Date sorting
      if (sortColumn === 'date') {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }

      // Numerical values
      if (['pnl', 'r_multiple', 'roi', 'ror', 'trade_rating'].includes(sortColumn)) {
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      // String fallback
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [filteredTrades, sortColumn, sortDirection]);

  // Handle Sort Toggle
  const toggleSort = (colName: string) => {
    if (sortColumn === colName) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colName);
      setSortDirection('desc');
    }
  };

  // Indian Rupees Currency Formatter style
  const formatINR = (val: number) => {
    const prefix = val < 0 ? '-₹' : '₹';
    return `${prefix}${Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Date Tag Helper (Today, Yesterday)
  const getDateDisplay = (dateStr: string) => {
    if (!dateStr) return { label: '—', isHighlight: false };
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (dateStr === today) {
        return { label: 'Today', isHighlight: true };
      }
      if (dateStr === yesterday) {
        return { label: 'Yesterday', isHighlight: false };
      }

      const d = new Date(dateStr);
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      return { label: `${day} ${month}`, isHighlight: false };
    } catch {
      return { label: dateStr, isHighlight: false };
    }
  };

  // Render score helpers
  const getWinRateColor = (wr: number) => {
    if (wr >= 60) return 'text-green-400';
    if (wr >= 45) return 'text-amber-400';
    return 'text-red-400';
  };

  const getAvgRColor = (r: number) => {
    if (r >= 1.5) return 'text-green-400';
    if (r > 0) return 'text-amber-400';
    return 'text-red-400';
  };

  const getProfitFactorColor = (pf: number) => {
    if (pf === Infinity || pf > 1.5) return '#22c55e';
    if (pf > 1) return '#f59e0b';
    return '#ef4444';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-indigo-500/30" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT SIDE MAIN CONTAINER */}
      <div className="flex-1 md:pl-[220px] flex flex-col min-h-screen">
        {/* MOBILE HEADER BAR */}
        <header 
          className="flex items-center justify-between px-6 py-4 md:hidden sticky top-0 z-20"
          style={{ backgroundColor: 'var(--topbar)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="text-xl font-bold tracking-wider font-display" style={{ color: 'var(--accent)' }}>TRADELYZE</div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg cursor-pointer"
            style={{ color: 'var(--text-sub)' }}
            aria-label="Open sidebar menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* CONTAINER CONTENT */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* PAGE HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight font-display" style={{ color: 'var(--text)' }}>
                  Trading Logs
                </h1>
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-sub)' }}>
                  Your complete trade history.
                </p>
              </div>
              <div>
                <Link
                  to="/trade-entry"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  className="hover:opacity-90 transition-all font-display shadow-lg shadow-cyan-500/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log New Trade</span>
                </Link>
              </div>
            </div>

            <div className="border-b mt-4 mb-6" style={{ borderColor: 'var(--border)' }} />

            {/* FILTER BAR SECTION CARD */}
            <div className="rounded-2xl p-5 mb-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
              {/* Row 1 Filter Fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Month Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Month
                  </label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                    className="rounded-xl px-3 py-2.5 w-full focus:border-indigo-500 focus:outline-none text-xs cursor-pointer"
                  >
                    <option value="All">All Months</option>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Year
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                    className="rounded-xl px-3 py-2.5 w-full focus:border-indigo-500 focus:outline-none text-xs cursor-pointer"
                  >
                    <option value="All">All Years</option>
                    {uniqueYears.map((y) => (
                      <option key={y} value={y.toString()}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Symbol Filter Text Input with absolute clearing button X */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Symbol
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={filterSymbol}
                      onChange={(e) => setFilterSymbol(e.target.value.toUpperCase())}
                      placeholder="e.g. BTCUSDT"
                      style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                      className="placeholder-zinc-500 rounded-xl pl-3 pr-8 py-2.5 w-full focus:border-indigo-500 focus:outline-none text-xs font-mono"
                    />
                    {filterSymbol && (
                      <button
                        type="button"
                        onClick={() => setFilterSymbol('')}
                        style={{ color: 'var(--text-muted)' }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 hover:opacity-80 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Setup Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Setup
                  </label>
                  <select
                    value={filterSetup}
                    onChange={(e) => setFilterSetup(e.target.value)}
                    style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                    className="rounded-xl px-3 py-2.5 w-full focus:border-indigo-500 focus:outline-none text-xs cursor-pointer"
                  >
                    <option value="All">All Setups</option>
                    {uniqueSetups.map((setupName) => (
                      <option key={setupName} value={setupName}>
                        {setupName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2 Filter Fields */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                {/* Status Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider mr-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Status:
                  </span>
                  {['All', 'Win', 'Loss', 'Breakeven'].map((st) => {
                    const isActive = filterStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFilterStatus(st)}
                        style={{
                          backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                          border: isActive ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
                          color: isActive ? 'var(--accent)' : 'var(--text-sub)',
                          padding: '5px 14px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: isActive ? 600 : 500,
                          cursor: 'pointer',
                        }}
                        className={isActive ? 'transition-all' : 'hover:bg-[var(--bar)] transition-all'}
                      >
                        {st}
                      </button>
                    );
                  })}

                  {/* Needs Review Filter Toggle Pill */}
                  <button
                    type="button"
                    onClick={() => setFilterNeedsReview(prev => !prev)}
                    style={{
                      backgroundColor: filterNeedsReview ? 'rgba(249,115,22,0.12)' : 'transparent',
                      border: filterNeedsReview ? '1px solid #f97316' : '0.5px solid var(--border)',
                      color: filterNeedsReview ? '#f97316' : 'var(--text-sub)',
                      padding: '5px 14px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: filterNeedsReview ? 600 : 500,
                      cursor: 'pointer',
                      marginLeft: '8px'
                    }}
                    className={filterNeedsReview ? 'transition-all font-semibold' : 'hover:bg-[var(--bar)] transition-all'}
                  >
                    ⚠️ Needs Review
                  </button>
                </div>

                {/* Executions & Mistakes selectors */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Executions */}
                  <select
                    value={filterExecution}
                    onChange={(e) => setFilterExecution(e.target.value)}
                    style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                    className="rounded-xl px-3 py-2 w-auto focus:border-indigo-500 focus:outline-none text-xs cursor-pointer"
                  >
                    <option value="All">All Executions</option>
                    <option value="BEST TRADE">BEST TRADE</option>
                    <option value="GOOD TRADE">GOOD TRADE</option>
                    <option value="AVERAGE TRADE">AVERAGE TRADE</option>
                    <option value="POOR TRADE">POOR TRADE</option>
                    <option value="BAD TRADE">BAD TRADE</option>
                  </select>

                  {/* Mistakes dropdown */}
                  <select
                    value={filterMistakeType}
                    onChange={(e) => setFilterMistakeType(e.target.value)}
                    style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                    className="rounded-xl px-3 py-2 w-auto focus:border-indigo-500 focus:outline-none text-xs cursor-pointer"
                  >
                    <option value="All">All Mistakes</option>
                    <option value="Technical">Technical</option>
                    <option value="Psychological">Psychological</option>
                    <option value="Risk Management">Risk Management</option>
                    <option value="No Mistake">No Mistake</option>
                  </select>

                  {/* Reset Filters button */}
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-3.5 py-2 text-xs font-semibold text-zinc-400 border border-zinc-800 hover:text-white rounded-xl hover:bg-zinc-850 cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="sticky top-0 z-20 p-4 mb-5 shadow-sm" style={{ backgroundColor: 'var(--card)', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: '0', zIndex: 20 }}>
              <div className="flex flex-wrap items-center justify-between sm:justify-start gap-y-3 gap-x-6 text-sm md:divide-x" style={{ color: 'var(--text-sub)', borderColor: 'var(--border)' }}>
                <div className="font-medium pr-1">
                  Showing <span className="font-extrabold text-indigo-400">{stats.count}</span> trades
                </div>
                
                <div className="md:pl-6 flex items-center gap-1.5" style={{ borderColor: 'var(--border)' }}>
                  <span>Total P&L:</span>
                  <span
                    className={`font-mono font-extrabold text-base ${
                      stats.totalPnl > 0
                        ? 'text-green-400'
                        : stats.totalPnl < 0
                        ? 'text-red-400'
                        : ''
                    }`}
                    style={{ color: stats.totalPnl === 0 ? 'var(--text-sub)' : undefined }}
                  >
                    {formatINR(stats.totalPnl)}
                  </span>
                </div>

                <div className="md:pl-6 flex items-center gap-1.5" style={{ borderColor: 'var(--border)' }}>
                  <span>Win Rate:</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    {stats.winRate.toFixed(0)}%
                  </span>
                </div>

                <div className="md:pl-6 flex items-center gap-1.5" style={{ borderColor: 'var(--border)' }}>
                  <span>Avg R:</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }} className="font-mono">
                    {stats.avgR > 0 ? '+' : ''}
                    {stats.avgR.toFixed(2)}R
                  </span>
                </div>

                <div className="md:pl-6 flex items-center gap-1.5 pr-2" style={{ borderColor: 'var(--border)' }}>
                  <span>Profit Factor:</span>
                  <span
                    style={{
                      color: getProfitFactorColor(stats.profitFactor),
                      fontWeight: 700
                    }}
                    className="font-mono"
                  >
                    {stats.profitFactor === Infinity ? 'MAX' : stats.profitFactor.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* ERROR SKELETON OR DYNAMIC TABLES LAYOUT */}
            {loading ? (
              <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-[10px] font-mono font-extrabold uppercase tracking-widest" style={{ backgroundColor: 'var(--row)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      <th className="px-4 py-4">#</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Symbol</th>
                      <th className="px-4 py-4">Dir</th>
                      <th className="px-4 py-4">Setup</th>
                      <th className="px-4 py-4">P&L</th>
                      <th className="px-4 py-4">R</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Execution</th>
                      <th className="px-4 py-4 hidden sm:table-cell">Mistakes</th>
                      <th className="px-4 py-4 hidden sm:table-cell">Rating</th>
                      <th className="px-4 py-4 hidden sm:table-cell">ROI</th>
                      <th className="px-4 py-4 w-12 text-center">AI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <tr key={idx} className="border-t animate-pulse opacity-60" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-4.5"><div className="h-4 rounded w-4" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5"><div className="h-4 rounded w-12" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5"><div className="h-4 rounded w-16" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5"><div className="h-4 rounded w-8" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5"><div className="h-4 rounded w-24" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5"><div className="h-4 rounded w-16" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5"><div className="h-4 rounded w-10" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5"><div className="h-4 rounded w-12" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5"><div className="h-4 rounded w-12" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5 hidden sm:table-cell"><div className="h-4 rounded w-16" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5 hidden sm:table-cell"><div className="h-4 rounded w-12" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5 hidden sm:table-cell"><div className="h-4 rounded w-10" style={{ backgroundColor: 'var(--row)' }} /></td>
                        <td className="px-4 py-4.5 text-center"><div className="h-4 rounded w-8 mx-auto" style={{ backgroundColor: 'var(--row)' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : allTrades.length === 0 ? (
              /* EMPTY JOURNAL NO TRADES YET */
              <div className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                  <BarChart className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>Your Trading Journal is Empty</h3>
                <p className="text-sm mt-3 max-w-sm" style={{ color: 'var(--text-sub)' }}>
                  Record your completed trades to visualize metric distributions, calculate dynamic win ratios, and discover key behavioral leakages.
                </p>
                <Link
                  to="/trade-entry"
                  className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl px-6 py-3.5 text-xs uppercase tracking-widest font-mono transition-all inline-flex items-center gap-2 shadow-lg shadow-indigo-600/15"
                >
                  <span>Log Your First Trade</span>
                  <Plus className="w-4 h-4" />
                </Link>
              </div>
            ) : filteredTrades.length === 0 ? (
              /* EMPTY LOG RESULTS FILTER ZERO */
              <div className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-16 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 text-zinc-500" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text)' }}>No Trades Match Filters</h3>
                <p className="text-xs mt-2 max-w-xs" style={{ color: 'var(--text-sub)' }}>
                  Adjust your criteria or clear active selectors to inspect matching journaled events.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-6 hover:opacity-90 font-bold px-4 py-2 text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              </div>
            ) : (
              /* MAIN INTERACTIVE SORTABLE DATATABLE */
              <div className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b text-[10px] font-sans font-semibold uppercase tracking-widest select-none" style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        <th className="px-4 py-4 w-10 text-center">#</th>
                        
                        {/* Sortable headers */}
                        <th
                          onClick={() => toggleSort('date')}
                          className="px-4 py-4 cursor-pointer hover:text-zinc-650 transition-colors whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1">
                            <span>Date</span>
                            {sortColumn === 'date' ? (
                              sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-400" /> : <ChevronDown className="w-3 h-3 text-indigo-400" />
                            ) : null}
                          </div>
                        </th>

                        <th className="px-4 py-4">Symbol</th>
                        
                        <th className="px-4 py-4 hidden md:table-cell">Dir</th>
                        <th className="px-4 py-4 hidden md:table-cell">Setup</th>

                        <th
                          onClick={() => toggleSort('pnl')}
                          className="px-4 py-4 cursor-pointer hover:text-zinc-650 transition-colors whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1">
                            <span>P&L</span>
                            {sortColumn === 'pnl' ? (
                              sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-400" /> : <ChevronDown className="w-3 h-3 text-indigo-400" />
                            ) : null}
                          </div>
                        </th>

                        <th
                          onClick={() => toggleSort('r_multiple')}
                          className="px-4 py-4 cursor-pointer hover:text-zinc-650 transition-colors whitespace-nowrap hidden md:table-cell"
                        >
                          <div className="flex items-center gap-1">
                            <span>R</span>
                            {sortColumn === 'r_multiple' ? (
                              sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-400" /> : <ChevronDown className="w-3 h-3 text-indigo-400" />
                            ) : null}
                          </div>
                        </th>

                        <th className="px-4 py-4">Status</th>
                        
                        <th className="px-4 py-4 hidden md:table-cell">Execution</th>
                        <th className="px-4 py-4 hidden md:table-cell">Mistakes</th>
                        
                        <th
                          onClick={() => toggleSort('trade_rating')}
                          className="px-4 py-4 cursor-pointer hover:text-zinc-650 transition-colors whitespace-nowrap hidden md:table-cell w-20"
                        >
                          <div className="flex items-center gap-1">
                            <span>Rating</span>
                            {sortColumn === 'trade_rating' ? (
                              sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-400" /> : <ChevronDown className="w-3 h-3 text-indigo-400" />
                            ) : null}
                          </div>
                        </th>

                        <th
                          onClick={() => toggleSort('roi')}
                          className="px-4 py-4 cursor-pointer hover:text-zinc-650 transition-colors whitespace-nowrap hidden md:table-cell"
                        >
                          <div className="flex items-center gap-1">
                            <span>ROI</span>
                            {sortColumn === 'roi' ? (
                              sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-400" /> : <ChevronDown className="w-3 h-3 text-indigo-400" />
                            ) : null}
                          </div>
                        </th>
                        <th className="px-4 py-4 w-12 text-center">AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTrades.map((item, index) => {
                        const originalPosIndex = sortedTrades.length - index;
                        const hasProfit = item.pnl !== null && item.pnl > 0;
                        const hasLoss = item.pnl !== null && item.pnl < 0;
                        const dateTagStr = getDateDisplay(item.date);

                        return (
                          <tr
                            key={item.id}
                            onClick={() => navigate(`/trading-logs/${item.id}`)}
                            className="hover:bg-[var(--row)] cursor-pointer transition-colors text-sm"
                            style={{ borderBottom: '0.5px solid var(--border)', color: 'var(--text)' }}
                          >
                            {/* Counter Index */}
                            <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }} className="text-center text-xs font-mono font-bold w-10">
                              {index + 1}
                            </td>

                            {/* Date Column with dynamic Today/Yesterday pill */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap">
                              <span className="font-mono text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--text-sub)' }}>
                                {dateTagStr.label === 'Today' || dateTagStr.label === 'Yesterday' ? (
                                  <span
                                    style={{
                                      backgroundColor: 'var(--accent-muted)',
                                      color: 'var(--accent)',
                                      border: '0.5px solid var(--accent)',
                                      borderRadius: '999px',
                                      padding: '2px 8px',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      letterSpacing: '0.3px',
                                    }}
                                    className="uppercase font-sans"
                                  >
                                    {dateTagStr.label}
                                  </span>
                                ) : (
                                  <span>{dateTagStr.label}</span>
                                )}
                              </span>
                            </td>

                            {/* Symbol text-white */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap font-sans">
                              <div className="flex items-center gap-2">
                                <span className="font-bold font-mono tracking-wide" style={{ color: 'var(--text)' }}>
                                  {item.symbol}
                                </span>
                                {item.needs_review && (
                                  <span 
                                    style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316', border: '0.5px solid #f97316' }}
                                    className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded tracking-wider whitespace-nowrap"
                                  >
                                    Needs Review
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Direction CALL/PUT/LONG/SHORT */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap hidden md:table-cell">
                              {item.call_put ? (
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                                    item.call_put === 'CALL'
                                      ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                      : item.call_put === 'PUT'
                                      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                      : item.call_put === 'LONG'
                                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                      : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                  }`}
                                >
                                  {item.call_put}
                                </span>
                              ) : (
                                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>

                            {/* Setup Selection Strategy Name */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap hidden md:table-cell max-w-[150px] truncate">
                              {item.strategies?.name ? (
                                <span className="font-semibold font-mono text-xs" style={{ color: 'var(--text-sub)' }}>
                                  {item.strategies.name}
                                </span>
                              ) : (
                                <span className="italic font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                  No Setup
                                </span>
                              )}
                            </td>

                            {/* Pnl Currency Format */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap">
                              <span
                                style={{
                                  color: hasProfit ? '#22c55e' : hasLoss ? '#ef4444' : 'var(--text-muted)',
                                  fontWeight: 700
                                }}
                                className="font-mono text-sm"
                              >
                                {item.pnl !== null ? formatINR(item.pnl) : '—'}
                              </span>
                            </td>

                            {/* R Multiple */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap hidden md:table-cell">
                              {item.r_multiple !== null ? (
                                <span
                                  className={`font-mono font-bold text-xs ${
                                    item.r_multiple > 0 ? 'text-green-500' : 'text-red-500'
                                  }`}
                                >
                                  {item.r_multiple > 0 ? '+' : ''}
                                  {item.r_multiple.toFixed(2)}R
                                </span>
                              ) : (
                                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>

                            {/* Status WIN/LOSS */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap">
                              {item.status === 'Win' && (
                                <span style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }} className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-lg">
                                  WIN
                                </span>
                              )}
                              {item.status === 'Loss' && (
                                <span style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }} className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-lg">
                                  LOSS
                                </span>
                              )}
                              {item.status === 'Breakeven' && (
                                <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-lg">
                                  BE
                                </span>
                              )}
                              {item.status === null && (
                                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>

                            {/* Execution quality */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap hidden md:table-cell">
                              {item.execution_status ? (
                                <span
                                  style={{
                                    backgroundColor:
                                      item.execution_status === 'BEST TRADE'
                                        ? 'rgba(34,197,94,0.12)'
                                        : item.execution_status === 'GOOD TRADE'
                                        ? 'rgba(20,184,166,0.12)'
                                        : item.execution_status === 'AVERAGE TRADE'
                                        ? 'rgba(234,179,8,0.12)'
                                        : item.execution_status === 'POOR TRADE'
                                        ? 'rgba(249,115,22,0.12)'
                                        : 'rgba(239,68,68,0.12)',
                                    color:
                                      item.execution_status === 'BEST TRADE'
                                        ? '#22c55e'
                                        : item.execution_status === 'GOOD TRADE'
                                        ? '#14b8a6'
                                        : item.execution_status === 'AVERAGE TRADE'
                                        ? '#ca8a04'
                                        : item.execution_status === 'POOR TRADE'
                                        ? '#f97316'
                                        : '#ef4444',
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wide font-extrabold rounded-md"
                                >
                                  {item.execution_status}
                                </span>
                              ) : (
                                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>

                            {/* Mistakes list cell */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap hidden md:table-cell max-w-[125px] truncate">
                              {item.mistake_type && item.mistake_type !== 'No Mistake' ? (
                                <span className="text-xs" style={{ color: 'var(--text-sub)' }}>
                                  {item.mistake_type}
                                </span>
                              ) : (
                                <span className="font-mono text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                  None
                                </span>
                              )}
                            </td>

                            {/* Stars rating */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap hidden md:table-cell">
                              {item.trade_rating && item.trade_rating > 0 ? (
                                <div className="flex items-center gap-0.5 text-amber-500">
                                  {Array.from({ length: item.trade_rating }).map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-current" />
                                  ))}
                                </div>
                              ) : (
                                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>

                            {/* ROI percent decimal */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap hidden md:table-cell">
                              {item.roi !== null ? (
                                <span
                                  className={`font-mono font-bold text-xs ${
                                    item.roi > 0 ? 'text-green-500' : 'text-red-500'
                                  }`}
                                >
                                  {item.roi > 0 ? '+' : ''}
                                  {item.roi.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>

                            {/* AI Action column */}
                            <td style={{ padding: '10px 16px' }} className="whitespace-nowrap text-center">
                              <button
                                id={`logs-table-ask-ai-${item.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/ai-teacher?tradeId=${item.id}`);
                                }}
                                style={{
                                  backgroundColor: 'var(--accent-muted)',
                                  color: 'var(--accent)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 650,
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                                className="transition-all hover:opacity-85 font-sans"
                              >
                                AI
                              </button>
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
