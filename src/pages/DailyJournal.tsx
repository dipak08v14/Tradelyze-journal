import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import { formatINR, MONTH_NAMES } from '../lib/calculations';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Award,
  Calendar as CalendarIcon,
  Plus
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface Trade {
  id: string;
  user_id: string;
  date: string;
  entry_time: string | null;
  exit_time: string | null;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  option_type: 'CALL' | 'PUT' | 'CE' | 'PE' | null | string;
  quantity: number | null;
  pnl: number | null;
  fees: number | null;
  r_multiple: number | null;
  execution_status: 'BEST TRADE' | 'GOOD TRADE' | 'AVERAGE TRADE' | 'POOR TRADE' | 'BAD TRADE' | null;
  holding_time_mins: number | null;
  status: 'Win' | 'Loss' | 'Breakeven' | null;
  strategies?: {
    name: string;
  } | null;
}

export const DailyJournal: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [hasNoTradesEver, setHasNoTradesEver] = useState<boolean>(false);
  
  // Selected Month and Year controls
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const currentMonthIdx = new Date().getMonth();
    return MONTH_NAMES[currentMonthIdx];
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return new Date().getFullYear();
  });

  // Trades fetched for this selected month
  const [trades, setTrades] = useState<Trade[]>([]);

  // Expanded collapsible days keys
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [highlightedDay, setHighlightedDay] = useState<string | null>(null);

  // Check if they have at least 1 trade ever
  const checkNeverTraded = async () => {
    if (!userId) return;
    try {
      const { count, error } = await supabase
        .from('trades')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (!error && count !== null) {
        setHasNoTradesEver(count === 0);
      }
    } catch (err) {
      console.error('Error checking trade count:', err);
    }
  };

  // Fetch trades for selected month and year
  const fetchTradesForPeriod = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*, strategies(name)')
        .eq('user_id', userId)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (error) throw error;
      setTrades((data as any) || []);
    } catch (err: any) {
      console.error('Error fetching trades for Daily Journal:', err);
      showError(err.message || 'Failed to load journal records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      checkNeverTraded();
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchTradesForPeriod();
    }
  }, [userId, selectedMonth, selectedYear]);

  // Group trades by date on client side
  const groupedTrades = useMemo(() => {
    const groups: Record<string, Trade[]> = {};
    trades.forEach((trade) => {
      if (!trade.date) return;
      if (!groups[trade.date]) {
        groups[trade.date] = [];
      }
      groups[trade.date].push(trade);
    });

    // Sort trades in each date group chronologically by entry_time
    Object.keys(groups).forEach((dateKey) => {
      groups[dateKey].sort((a, b) => {
        const timeA = a.entry_time || '00:00';
        const timeB = b.entry_time || '00:00';
        return timeA.localeCompare(timeB);
      });
    });

    return groups;
  }, [trades]);

  // List of unique dates with trades, newest date first
  const sortedDates = useMemo(() => {
    return Object.keys(groupedTrades).sort((a, b) => b.localeCompare(a));
  }, [groupedTrades]);

  // Expand and collapse controllers
  const handleCollapseAll = () => {
    const newState: Record<string, boolean> = {};
    sortedDates.forEach((d) => {
      newState[d] = false;
    });
    setExpandedDays(newState);
  };

  const handleExpandAll = () => {
    const newState: Record<string, boolean> = {};
    sortedDates.forEach((d) => {
      newState[d] = true;
    });
    setExpandedDays(newState);
  };

  const toggleDayCard = (dateStr: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  // Calendar generation logic
  const calendarDays = useMemo(() => {
    const monthIdx = MONTH_NAMES.indexOf(selectedMonth);
    const firstDay = new Date(selectedYear, monthIdx, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday, 6 is Saturday
    
    const numDays = new Date(selectedYear, monthIdx + 1, 0).getDate();
    const prevMonthNumDays = new Date(selectedYear, monthIdx, 0).getDate();
    
    const days: { day: number; month: string; year: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    
    // Trailing days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthNumDays - i;
      let prevMIdx = monthIdx - 1;
      let prevYr = selectedYear;
      if (prevMIdx < 0) {
        prevMIdx = 11;
        prevYr -= 1;
      }
      const mStr = MONTH_NAMES[prevMIdx];
      const isoStr = `${prevYr}-${String(prevMIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: mStr,
        year: prevYr,
        isCurrentMonth: false,
        dateStr: isoStr,
      });
    }
    
    // Days of current month
    for (let d = 1; d <= numDays; d++) {
      const isoStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: selectedMonth,
        year: selectedYear,
        isCurrentMonth: true,
        dateStr: isoStr,
      });
    }
    
    // Leading days from next month to complete the grid (standard 42 grid cells)
    const totalCells = 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      let nextMIdx = monthIdx + 1;
      let nextYr = selectedYear;
      if (nextMIdx > 11) {
        nextMIdx = 0;
        nextYr += 1;
      }
      const mStr = MONTH_NAMES[nextMIdx];
      const isoStr = `${nextYr}-${String(nextMIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: mStr,
        year: nextYr,
        isCurrentMonth: false,
        dateStr: isoStr,
      });
    }
    
    return days;
  }, [selectedMonth, selectedYear]);

  // Calendar Month-navigation arrows
  const handlePrevMonth = () => {
    let monthIdx = MONTH_NAMES.indexOf(selectedMonth);
    let yr = selectedYear;
    if (monthIdx === 0) {
      monthIdx = 11;
      yr -= 1;
    } else {
      monthIdx -= 1;
    }
    setSelectedMonth(MONTH_NAMES[monthIdx]);
    setSelectedYear(yr);
  };

  const handleNextMonth = () => {
    let monthIdx = MONTH_NAMES.indexOf(selectedMonth);
    let yr = selectedYear;
    if (monthIdx === 11) {
      monthIdx = 0;
      yr += 1;
    } else {
      monthIdx += 1;
    }
    setSelectedMonth(MONTH_NAMES[monthIdx]);
    setSelectedYear(yr);
  };

  // Scroll to day card and briefly highlight
  const scrollToDayCard = (dateStr: string) => {
    setTimeout(() => {
      const el = document.getElementById(`day-card-${dateStr}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedDay(dateStr);
        setExpandedDays((prev) => ({ ...prev, [dateStr]: true }));
        setTimeout(() => {
          setHighlightedDay(null);
        }, 2000);
      }
    }, 200);
  };

  const handleCalendarDayClick = (dayObj: { day: number; month: string; year: number; isCurrentMonth: boolean; dateStr: string }) => {
    if (!dayObj.isCurrentMonth) {
      setSelectedMonth(dayObj.month);
      setSelectedYear(dayObj.year);
    }
    scrollToDayCard(dayObj.dateStr);
  };

  // Helpers for stats and dates
  const formatJournalDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        });
      }
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getDayStats = (dayTrades: Trade[]) => {
    const totalTrades = dayTrades.length;
    const winners = dayTrades.filter((t) => t.status === 'Win');
    const losers = dayTrades.filter((t) => t.status === 'Loss');
    const winnersCount = winners.length;
    const losersCount = losers.length;

    const grossPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const commissions = dayTrades.reduce((sum, t) => sum + (t.fees || 0), 0);
    const volume = dayTrades.reduce((sum, t) => sum + (t.quantity || 0), 0);

    const winRate = totalTrades > 0 ? (winnersCount / totalTrades) * 100 : 0;

    const totalProfit = dayTrades.reduce((sum, t) => sum + (t.pnl && t.pnl > 0 ? t.pnl : 0), 0);
    const totalLoss = dayTrades.reduce((sum, t) => sum + (t.pnl && t.pnl < 0 ? Math.abs(t.pnl) : 0), 0);
    const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : '—';

    return {
      totalTrades,
      winnersCount,
      losersCount,
      grossPnl,
      commissions,
      volume,
      winRate: totalTrades > 0 ? `${winRate.toFixed(2)}%` : '—',
      profitFactor,
    };
  };

  const getCurveData = (dayTrades: Trade[]) => {
    const data = [{ tradeIndex: 0, pnl: 0 }];
    let sum = 0;
    dayTrades.forEach((t, i) => {
      sum += (t.pnl || 0) - (t.fees || 0);
      data.push({
        tradeIndex: i + 1,
        pnl: sum,
      });
    });
    return data;
  };

  const formatHoldTime = (mins: number | null | undefined) => {
    if (mins === null || mins === undefined || isNaN(mins)) return '—';
    if (mins < 60) {
      return `${mins}m`;
    }
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
  };

  // Generate Year Array for filters
  const yearsList = useMemo(() => {
    const arr = [];
    for (let yr = 2020; yr <= 2030; yr++) {
      arr.push(yr);
    }
    return arr;
  }, []);

  // Today check for Calendar border/ring
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight font-display" style={{ color: 'var(--text)' }}>
                  Daily Journal
                </h1>
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-sub)' }}>
                  Interactive day-by-day catalog of your trade histories.
                </p>
              </div>

              {/* MONTH/YEAR SELECTS */}
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                  className="rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all font-medium"
                >
                  {MONTH_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                  className="rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all font-medium"
                >
                  {yearsList.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasNoTradesEver ? (
              /* EMPTY STATE: NO TRADES EVER */
              <div className="mt-12 rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                  <Award className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold tracking-tight font-display" style={{ color: 'var(--text)' }}>
                  No trades recorded yet.
                </h3>
                <p className="text-xs mt-1.5 max-w-sm" style={{ color: 'var(--text-sub)' }}>
                  Add your first trade to get started.
                </p>
                <button
                  onClick={() => navigate('/trade-entry')}
                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                  className="mt-6 px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide shadow transition-all hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Log First Trade
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
                {/* LEFT MAIN AREA (~75%): COLLAPSIBLE CARDS LIST */}
                <div className="lg:col-span-3 space-y-4">
                  {/* EXPAND / COLLAPSE ALL ACTIONS */}
                  {sortedDates.length > 0 && (
                    <div className="flex gap-2 justify-start pb-2">
                      <button
                        onClick={handleExpandAll}
                        style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-sub)' }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-zinc-800 transition-all"
                      >
                        Expand All
                      </button>
                      <button
                        onClick={handleCollapseAll}
                        style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-sub)' }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-zinc-800 transition-all"
                      >
                        Collapse All
                      </button>
                    </div>
                  )}

                  {loading ? (
                    <div className="py-12 flex justify-center items-center">
                      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }} />
                    </div>
                  ) : sortedDates.length === 0 ? (
                    /* EMPTY STATE: NO TRADES IN SELECTED PERIOD */
                    <div className="rounded-xl p-12 text-center flex flex-col items-center justify-center py-20" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        No trades found for {selectedMonth} {selectedYear}.
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Choose another month or log a trade using the Entry interface.
                      </p>
                    </div>
                  ) : (
                    sortedDates.map((dateStr) => {
                      const dayTrades = groupedTrades[dateStr] || [];
                      const isExpanded = !!expandedDays[dateStr];
                      const isHighlighted = highlightedDay === dateStr;

                      // Net P&L = SUM(pnl) minus SUM(fees)
                      const sumPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                      const sumFees = dayTrades.reduce((sum, t) => sum + (t.fees || 0), 0);
                      const dailyNetPnl = sumPnl - sumFees;

                      // Stats
                      const dayStats = getDayStats(dayTrades);

                      // Curve color
                      const curvePnlColor = dailyNetPnl >= 0 ? '#22c55e' : '#ef4444';
                      const curveFillColor = dailyNetPnl >= 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)';

                      return (
                        <div
                          key={dateStr}
                          id={`day-card-${dateStr}`}
                          style={{
                            backgroundColor: 'var(--card)',
                            border: isHighlighted ? '2px solid var(--accent)' : '0.5px solid var(--border)',
                            boxShadow: isHighlighted ? '0 0 15px rgba(99, 102, 241, 0.35)' : 'none',
                            transition: 'all 400ms ease-in-out',
                          }}
                          className="rounded-xl overflow-hidden shadow-sm"
                        >
                          {/* CARD HEADER */}
                          <div
                            onClick={() => toggleDayCard(dateStr)}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50/10 transition-colors select-none"
                          >
                            <div className="flex items-center gap-3">
                              {/* Expand/collapse icon */}
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-zinc-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-zinc-400" />
                              )}
                              <span className="font-semibold text-sm md:text-base font-mono" style={{ color: 'var(--text)' }}>
                                {formatJournalDate(dateStr)}
                              </span>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Net P&L display */}
                              <span
                                className="font-mono text-xs md:text-sm font-bold"
                                style={{
                                  color: dailyNetPnl > 0 ? '#22c55e' : dailyNetPnl < 0 ? '#ef4444' : 'var(--text-muted)',
                                }}
                              >
                                {dailyNetPnl !== 0 ? formatINR(dailyNetPnl) : '—'}
                              </span>

                              {/* Placeholder Add Note button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Avoid triggering card expand/collapse
                                }}
                                style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bar)', color: 'var(--text-sub)' }}
                                className="px-2.5 py-1 rounded text-[11px] font-medium transition-opacity cursor-pointer hover:opacity-85"
                              >
                                Add Note
                              </button>
                            </div>
                          </div>

                          {/* EXPANDED CONTENT AREA */}
                          {isExpanded && (
                            <div className="border-t px-5 pb-6 pt-4" style={{ borderColor: 'var(--border)' }}>
                              {/* SECTION 1 — Mini equity curve chart */}
                              <div className="mb-6">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                                  Running Net P&L Trajectory
                                </h4>
                                <div className="h-[120px] w-full rounded-lg" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={getCurveData(dayTrades)} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                      <Tooltip
                                        formatter={(val: any) => [formatINR(val), 'Cumulative Net P&L']}
                                        labelFormatter={(label) => `Trade #${label}`}
                                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontFamily: 'monospace', fontSize: '11px' }}
                                      />
                                      <Area
                                        type="monotone"
                                        dataKey="pnl"
                                        stroke={curvePnlColor}
                                        fill={curveFillColor}
                                        strokeWidth={1.5}
                                        dot={{ r: 3, fill: curvePnlColor }}
                                        activeDot={{ r: 5 }}
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              {/* SECTION 2 — Stats grid */}
                              <div className="mb-6">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                                  Day Performance Scorecard
                                </h4>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                                  {/* Total Trades */}
                                  <div>
                                    <span className="text-[10px] uppercase font-semibold text-zinc-500" style={{ color: 'var(--text-muted)' }}>Total Trades</span>
                                    <p className="text-base font-bold font-mono mt-0.5" style={{ color: 'var(--text)' }}>
                                      {dayStats.totalTrades}
                                    </p>
                                  </div>
                                  {/* Winners */}
                                  <div>
                                    <span className="text-[10px] uppercase font-semibold text-zinc-500" style={{ color: 'var(--text-muted)' }}>Winners</span>
                                    <p className="text-base font-bold font-mono mt-0.5 text-green-400">
                                      {dayStats.winnersCount}
                                    </p>
                                  </div>
                                  {/* Gross P&L */}
                                  <div>
                                    <span className="text-[10px] uppercase font-semibold text-zinc-500" style={{ color: 'var(--text-muted)' }}>Gross P&L</span>
                                    <p className="text-base font-bold font-mono mt-0.5" style={{ color: dayStats.grossPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                                      {formatINR(dayStats.grossPnl)}
                                    </p>
                                  </div>
                                  {/* Commissions */}
                                  <div>
                                    <span className="text-[10px] uppercase font-semibold text-zinc-500" style={{ color: 'var(--text-muted)' }}>Commissions</span>
                                    <p className="text-base font-bold font-mono mt-0.5 text-zinc-400">
                                      {formatINR(dayStats.commissions)}
                                    </p>
                                  </div>
                                  {/* Win Rate */}
                                  <div>
                                    <span className="text-[10px] uppercase font-semibold text-zinc-500" style={{ color: 'var(--text-muted)' }}>Win Rate</span>
                                    <p className="text-base font-bold font-mono mt-0.5" style={{ color: 'var(--text)' }}>
                                      {dayStats.winRate}
                                    </p>
                                  </div>
                                  {/* Losers */}
                                  <div>
                                    <span className="text-[10px] uppercase font-semibold text-zinc-500" style={{ color: 'var(--text-muted)' }}>Losers</span>
                                    <p className="text-base font-bold font-mono mt-0.5 text-red-400">
                                      {dayStats.losersCount}
                                    </p>
                                  </div>
                                  {/* Volume */}
                                  <div>
                                    <span className="text-[10px] uppercase font-semibold text-zinc-500" style={{ color: 'var(--text-muted)' }}>Volume</span>
                                    <p className="text-base font-bold font-mono mt-0.5" style={{ color: 'var(--text)' }}>
                                      {dayStats.volume}
                                    </p>
                                  </div>
                                  {/* Profit Factor */}
                                  <div>
                                    <span className="text-[10px] uppercase font-semibold text-zinc-500" style={{ color: 'var(--text-muted)' }}>Profit Factor</span>
                                    <p className="text-base font-bold font-mono mt-0.5" style={{ color: 'var(--text)' }}>
                                      {dayStats.profitFactor}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* SECTION 3 — Trade table */}
                              <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                                  Individual Day Trades
                                </h4>
                                <div className="overflow-x-auto" style={{ border: '0.5px solid var(--border)', borderRadius: '10px' }}>
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr style={{ backgroundColor: 'var(--bar)', borderBottom: '0.5px solid var(--border)' }}>
                                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Time</th>
                                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Symbol</th>
                                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Dir</th>
                                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Setup</th>
                                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Qty</th>
                                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Net P&L</th>
                                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>R</th>
                                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Execution</th>
                                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Hold</th>
                                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Result</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                                      {dayTrades.map((t) => {
                                        return (
                                          <tr
                                            key={t.id}
                                            onClick={() => navigate(`/trade/${t.id}`)}
                                            className="hover:bg-zinc-50/5 transition-colors cursor-pointer"
                                          >
                                            {/* Column 1 - Time */}
                                            <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text)' }}>
                                              {t.entry_time ? t.entry_time.slice(0, 5) : '—'}
                                            </td>

                                            {/* Column 2 - Symbol */}
                                            <td className="px-4 py-2.5 font-semibold text-xs text-white">
                                              {t.symbol}
                                            </td>

                                            {/* Column 3 - Dir */}
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                              <span
                                                style={{
                                                  backgroundColor: t.direction === 'SHORT' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                                                  color: t.direction === 'SHORT' ? '#ef4444' : '#22c55e',
                                                }}
                                                className="px-2 py-0.5 text-[10px] font-bold rounded"
                                              >
                                                {t.direction}
                                              </span>
                                              {t.option_type && (
                                                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-zinc-800 text-zinc-300">
                                                  {t.option_type}
                                                </span>
                                              )}
                                            </td>

                                            {/* Column 4 - Setup */}
                                            <td className="px-4 py-2.5 truncate max-w-[120px]" style={{ color: 'var(--text-sub)' }}>
                                              {t.strategies?.name || '—'}
                                            </td>

                                            {/* Column 5 - Qty */}
                                            <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text)' }}>
                                              {t.quantity ?? '—'}
                                            </td>

                                            {/* Column 6 - Net P&L */}
                                            <td className="px-4 py-2.5 font-mono font-bold">
                                              <span style={{ color: (t.pnl || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                                                {t.pnl !== null ? formatINR(t.pnl) : '—'}
                                              </span>
                                            </td>

                                            {/* Column 7 - R */}
                                            <td className="px-4 py-2.5 font-mono">
                                              {t.r_multiple !== null && t.r_multiple !== undefined ? (
                                                <span style={{ color: t.r_multiple >= 0 ? '#22c55e' : '#ef4444' }} className="font-bold">
                                                  {t.r_multiple >= 0 ? '+' : ''}
                                                  {t.r_multiple.toFixed(1)}R
                                                </span>
                                              ) : (
                                                '—'
                                              )}
                                            </td>

                                            {/* Column 8 - Execution */}
                                            <td className="px-4 py-2.5">
                                              {t.execution_status ? (
                                                <span
                                                  style={{
                                                    backgroundColor:
                                                      t.execution_status === 'BEST TRADE'
                                                        ? 'rgba(34,197,94,0.12)'
                                                        : t.execution_status === 'GOOD TRADE'
                                                        ? 'rgba(20,184,166,0.12)'
                                                        : t.execution_status === 'AVERAGE TRADE'
                                                        ? 'rgba(234,179,8,0.12)'
                                                        : t.execution_status === 'POOR TRADE'
                                                        ? 'rgba(249,115,22,0.12)'
                                                        : 'rgba(239,68,68,0.12)',
                                                    color:
                                                      t.execution_status === 'BEST TRADE'
                                                        ? '#22c55e'
                                                        : t.execution_status === 'GOOD TRADE'
                                                        ? '#14b8a6'
                                                        : t.execution_status === 'AVERAGE TRADE'
                                                        ? '#ca8a04'
                                                        : t.execution_status === 'POOR TRADE'
                                                        ? '#f97316'
                                                        : '#ef4444',
                                                  }}
                                                  className="px-1.5 py-0.5 text-[9px] uppercase font-mono tracking-wide font-extrabold rounded-md inline-block"
                                                >
                                                  {t.execution_status}
                                                </span>
                                              ) : (
                                                '—'
                                              )}
                                            </td>

                                            {/* Column 9 - Hold */}
                                            <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text-sub)' }}>
                                              {formatHoldTime(t.holding_time_mins)}
                                            </td>

                                            {/* Column 10 - Result */}
                                            <td className="px-4 py-2.5">
                                              {t.status === 'Win' && (
                                                <span style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }} className="px-2 py-0.5 text-[10px] font-extrabold rounded">
                                                  WIN
                                                </span>
                                              )}
                                              {t.status === 'Loss' && (
                                                <span style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }} className="px-2 py-0.5 text-[10px] font-extrabold rounded">
                                                  LOSS
                                                </span>
                                              )}
                                              {t.status === 'Breakeven' && (
                                                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-zinc-800 border border-zinc-700 text-zinc-300 rounded">
                                                  BE
                                                </span>
                                              )}
                                              {t.status === null && '—'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* RIGHT SIDEBAR (~25%): CALENDAR WIDGET */}
                <div className="lg:col-span-1">
                  <div
                    style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}
                    className="rounded-xl p-4 sticky top-6 shadow-sm select-none"
                  >
                    {/* CALENDAR HEADER */}
                    <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-sm font-bold font-display" style={{ color: 'var(--text)' }}>
                        {selectedMonth} {selectedYear}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={handlePrevMonth}
                          className="p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                          style={{ color: 'var(--text-sub)' }}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleNextMonth}
                          className="p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                          style={{ color: 'var(--text-sub)' }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* WEEKDAYS HEADER ROW */}
                    <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      <span>Su</span>
                      <span>Mo</span>
                      <span>Tu</span>
                      <span>We</span>
                      <span>Th</span>
                      <span>Fr</span>
                      <span>Sa</span>
                    </div>

                    {/* CALENDAR CELLS GRID */}
                    <div className="grid grid-cols-7 gap-1 mt-1 text-center text-xs">
                      {calendarDays.map((dayObj, index) => {
                        const tradesOnDay = groupedTrades[dayObj.dateStr] || [];
                        const hasTrades = tradesOnDay.length > 0;
                        const isToday = dayObj.dateStr === todayStr;

                        // Calculate Net P&L for highlighting
                        const daySumPnl = tradesOnDay.reduce((sum, t) => sum + (t.pnl || 0), 0);
                        const daySumFees = tradesOnDay.reduce((sum, t) => sum + (t.fees || 0), 0);
                        const dailyNet = daySumPnl - daySumFees;

                        const isProfitable = dailyNet > 0;
                        const isLoss = dailyNet < 0;

                        // Conditional styles
                        let cellStyle: React.CSSProperties = {
                          aspectRatio: '1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          position: 'relative',
                          border: isToday ? '1.5px solid var(--accent)' : '1px solid transparent',
                        };

                        if (hasTrades) {
                          cellStyle.backgroundColor = isProfitable
                            ? 'rgba(34, 197, 94, 0.12)'
                            : isLoss
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(255, 255, 255, 0.08)';
                          cellStyle.color = isProfitable
                            ? '#22c55e'
                            : isLoss
                            ? '#ef4444'
                            : 'var(--text)';
                          cellStyle.fontWeight = 'bold';
                        } else {
                          cellStyle.color = dayObj.isCurrentMonth ? 'var(--text-sub)' : 'var(--text-muted)';
                          cellStyle.opacity = dayObj.isCurrentMonth ? '1' : '0.4';
                        }

                        return (
                          <div
                            key={`${dayObj.dateStr}-${index}`}
                            onClick={() => handleCalendarDayClick(dayObj)}
                            style={cellStyle}
                            className={`transition-all hover:brightness-110`}
                            title={hasTrades ? `${tradesOnDay.length} trades | Net P&L: ${formatINR(dailyNet)}` : ''}
                          >
                            <span>{dayObj.day}</span>
                            {/* Tiny dot to signify trades if style doesn't fully highlight */}
                            {hasTrades && (
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: '3px',
                                  width: '3.5px',
                                  height: '3.5px',
                                  borderRadius: '999px',
                                  backgroundColor: isProfitable ? '#22c55e' : isLoss ? '#ef4444' : '#a1a1aa',
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
