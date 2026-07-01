import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Plus,
  FileText
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  YAxis
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
  const [searchParams] = useSearchParams();

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
  const [linkedNotes, setLinkedNotes] = useState<{ id: string; title: string | null; log_date: string | null }[]>([]);

  // Expanded collapsible days keys
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [highlightedDay, setHighlightedDay] = useState<string | null>(null);

  const notesByDate = useMemo(() => {
    const map: Record<string, { id: string; title: string | null; log_date: string | null }[]> = {};
    linkedNotes.forEach(note => {
      if (!note.log_date) return;
      const dateKey = note.log_date.split('T')[0];
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(note);
    });
    return map;
  }, [linkedNotes]);

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
      const [tradesRes, notesRes] = await Promise.all([
        supabase
          .from('trades')
          .select('*, strategies(name)')
          .eq('user_id', userId)
          .eq('month', selectedMonth)
          .eq('year', selectedYear),
        supabase
          .from('notebook_entries')
          .select('id, title, log_date')
          .eq('user_id', userId)
          .not('log_date', 'is', null)
          .eq('is_deleted', false)
      ]);

      if (tradesRes.error) throw tradesRes.error;
      if (notesRes.error) throw notesRes.error;

      setTrades((tradesRes.data as any) || []);
      setLinkedNotes((notesRes.data as any) || []);
    } catch (err: any) {
      console.error('Error fetching trades for Daily Journal:', err);
      showError(err.message || 'Failed to load journal records.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNoteClick = async (dateKey: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('notebook_entries')
        .insert({
          user_id: userId,
          title: 'Untitled',
          content: '',
          log_date: dateKey,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;
      navigate(`/notebook?date=${dateKey}`);
    } catch (err: any) {
      console.error('Error creating linked note:', err);
      showError(err.message || 'Failed to create linked note.');
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

  // Handle navigation from Dashboard's View Details
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (!dateParam || !userId) return;

    // Parse YYYY-MM-DD
    const parts = dateParam.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        const monthName = MONTH_NAMES[monthIdx];
        
        // If current selected month/year is not correct, change them first and wait for reload
        if (selectedMonth !== monthName || selectedYear !== year) {
          setSelectedMonth(monthName);
          setSelectedYear(year);
          return; // This effect will run again after setSelectedMonth and setSelectedYear finish
        }
      }
    }

    // If we are in the correct month/year, and loading has finished, we can expand and scroll
    if (!loading) {
      // Expand that specific day card
      setExpandedDays(prev => ({ ...prev, [dateParam]: true }));

      // Highlight the day as well
      setHighlightedDay(dateParam);

      // Scroll to that day card after a short delay to allow render
      setTimeout(() => {
        const el = document.getElementById(`day-card-${dateParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);

      // Clear URL param so refresh doesn't retrigger
      window.history.replaceState({}, '', '/daily-journal');
    }
  }, [searchParams, loading, userId, selectedMonth, selectedYear]);

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
    setHighlightedDay(null);
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

  const getDayChartConfig = (dayChartData: any[]) => {
    const CUMULATIVE_FIELD = 'pnl';

    const values = dayChartData.map(d => d[CUMULATIVE_FIELD]).filter(v => typeof v === 'number');
    if (values.length === 0) return { domainMin: -100, domainMax: 100, zeroOffset: '50%', CUMULATIVE_FIELD };

    const dataMax = Math.max(...values, 0);
    const dataMin = Math.min(...values, 0);

    const padTop    = dataMax > 0 ? dataMax * 0.15 : 0;
    const padBottom = dataMin < 0 ? Math.abs(dataMin) * 0.15 : 0;

    const domainMax = dataMax + padTop;
    const domainMin = dataMin - padBottom;

    let zeroOffset;
    if (dataMin >= 0) {
      zeroOffset = '100%';
    } else if (dataMax <= 0) {
      zeroOffset = '0%';
    } else {
      const totalRange = domainMax - domainMin;
      zeroOffset = `${((domainMax / totalRange) * 100).toFixed(3)}%`;
    }

    return { domainMin, domainMax, zeroOffset, CUMULATIVE_FIELD };
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
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans selection:bg-indigo-500/30" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT SIDE MAIN CONTAINER */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-0">
          <div className="max-w-7xl mx-auto">
            {/* PAGE HEADER */}
            <div
              style={{
                background: 'var(--card)',
                width: 'calc(100% + 48px)',
                marginLeft: '-24px',
                marginRight: '-24px',
                paddingTop: '3px',
                paddingBottom: '3px',
                paddingLeft: '24px',
                paddingRight: '24px',
                borderRadius: 0,
                boxShadow: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <h1 className="font-display" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                Daily Journal
              </h1>

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
              <div className="mt-12 text-center flex flex-col items-center justify-center py-20" style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
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
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-y-6 gap-x-4 mt-4">
                {/* LEFT MAIN AREA (~75%): COLLAPSIBLE CARDS LIST */}
                <div className="lg:col-span-3 space-y-4">
                  {/* EXPAND / COLLAPSE ALL ACTIONS */}
                  {sortedDates.length > 0 && (
                    <div className="flex gap-2 justify-start pb-2" style={{ marginBottom: '10px' }}>
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
                    <div className="text-center flex flex-col items-center justify-center py-20" style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
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

                      const notesForDay = notesByDate[dateStr] || [];
                      const hasNotes = notesForDay.length > 0;

                      // Net P&L = SUM(pnl) minus SUM(fees)
                      const sumPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                      const sumFees = dayTrades.reduce((sum, t) => sum + (t.fees || 0), 0);
                      const dailyNetPnl = sumPnl - sumFees;

                      // Stats
                      const dayStats = getDayStats(dayTrades);

                      // Curve color
                      const curvePnlColor = dailyNetPnl >= 0 ? '#22c55e' : '#ef4444';
                      const curveFillColor = dailyNetPnl >= 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)';

                      // Step 1: Calculate zeroOffset for each day's chart
                      const dayData = getCurveData(dayTrades);
                      const { domainMin, domainMax, zeroOffset, CUMULATIVE_FIELD } = getDayChartConfig(dayData);
                      const daySuffix = dateStr.replace(/[^a-zA-Z0-9]/g, '_');

                      return (
                        <div
                          key={dateStr}
                          id={`day-card-${dateStr}`}
                          style={{
                            backgroundColor: 'var(--card)',
                            border: isHighlighted ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,0.06)',
                            borderRadius: '12px',
                            boxShadow: isHighlighted ? '0 0 15px rgba(99, 102, 241, 0.35)' : '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                            transition: 'all 400ms ease-in-out',
                          }}
                          className="overflow-hidden"
                        >
                          {/* CARD HEADER */}
                          <div
                            onClick={() => toggleDayCard(dateStr)}
                            className="flex items-center justify-between px-4 py-[10px] cursor-pointer hover:bg-zinc-50/10 transition-colors select-none"
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
                                  color: dailyNetPnl >= 0 ? '#008F67' : '#DF1C30',
                                }}
                              >
                                {dailyNetPnl !== 0 ? formatINR(dailyNetPnl) : '—'}
                              </span>

                              {/* Placeholder Add Note button */}
                              {hasNotes ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Avoid triggering card expand/collapse
                                    navigate(`/notebook?date=${dateStr}`);
                                  }}
                                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                                  className="px-2.5 py-1 rounded text-[11px] font-semibold transition-opacity cursor-pointer hover:opacity-85 inline-flex items-center gap-1 shrink-0"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  View Note
                                </button>
                              ) : (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation(); // Avoid triggering card expand/collapse
                                    await handleAddNoteClick(dateStr);
                                  }}
                                  style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bar)', color: 'var(--text-sub)' }}
                                  className="px-2.5 py-1 rounded text-[11px] font-medium transition-opacity cursor-pointer hover:opacity-85 inline-flex items-center gap-1 shrink-0"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add Note
                                </button>
                              )}
                            </div>
                          </div>

                          {/* EXPANDED CONTENT AREA */}
                          {isExpanded && (
                            <div className="border-t px-5 pb-6 pt-[5px]" style={{ borderColor: 'var(--border)' }}>
                              {/* SECTION 1 — Mini equity curve chart */}
                              <div className="mb-0">
                                <h4 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, textTransform: 'none' }} className="font-display mb-2">
                                  Running Net P&L Trajectory
                                </h4>
                                <div className="h-[120px] w-full rounded-lg" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dayData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                      <defs>
                                        <linearGradient id={`strokeGrad_${daySuffix}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#008F67" />
                                          <stop offset={zeroOffset} stopColor="#008F67" />
                                          <stop offset={zeroOffset} stopColor="#DF1C30" />
                                          <stop offset="100%" stopColor="#DF1C30" />
                                        </linearGradient>

                                        <linearGradient id={`fillGrad_${daySuffix}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#008F67" stopOpacity={0.16} />
                                          <stop offset={zeroOffset} stopColor="#008F67" stopOpacity={0.16} />
                                          <stop offset={zeroOffset} stopColor="#DF1C30" stopOpacity={0.16} />
                                          <stop offset="100%" stopColor="#DF1C30" stopOpacity={0.16} />
                                        </linearGradient>
                                      </defs>
                                      <YAxis hide domain={[domainMin, domainMax]} />
                                      <Tooltip
                                        content={({ active, payload, label }: any) => {
                                          if (!active || !payload?.length) return null;
                                          const val = Number(payload[0]?.value);
                                          return (
                                            <div style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text)' }}>
                                              <div style={{ color: 'var(--text-sub)', marginBottom: '2px' }}>Trade #{label}</div>
                                              <span style={{ color: 'var(--text)' }}>Cumulative Net P&L : </span>
                                              <span style={{ color: val >= 0 ? '#008F67' : '#DF1C30', fontWeight: 'bold' }}>
                                                ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                          );
                                        }}
                                      />
                                      <Area
                                        type="monotone"
                                        dataKey="pnl"
                                        stroke={`url(#strokeGrad_${daySuffix})`}
                                        fill={`url(#fillGrad_${daySuffix})`}
                                        strokeWidth={1.5}
                                        dot={(props: any) => {
                                          const val = props.payload[CUMULATIVE_FIELD] ?? 0;
                                          const color = val >= 0 ? '#008F67' : '#DF1C30';
                                          return (
                                            <circle
                                              cx={props.cx}
                                              cy={props.cy}
                                              r={3}
                                              fill={color}
                                              stroke="none"
                                              key={props.key}
                                            />
                                          );
                                        }}
                                        activeDot={(props: any) => {
                                          const val = props.payload[CUMULATIVE_FIELD] ?? 0;
                                          const isPositive = val >= 0;
                                          return (
                                            <circle
                                              cx={props.cx}
                                              cy={props.cy}
                                              r={5}
                                              fill={isPositive ? '#008F67' : '#DF1C30'}
                                              stroke="var(--card)"
                                              strokeWidth={1.5}
                                            />
                                          );
                                        }}
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              {/* SECTION 2 — Stats grid */}
                              <div className="mb-0" style={{ marginTop: '5px' }}>
                                <h4 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, textTransform: 'none' }} className="font-display mb-2">
                                  Daily Summary
                                </h4>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--row)', border: '1px solid var(--border)' }}>
                                  {/* Total Trades */}
                                  <div>
                                    <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }} className="block">Total Trades</span>
                                    <p className="font-mono mt-0.5 text-foreground" style={{ fontSize: '22px', fontWeight: 700 }}>
                                      <span style={{ fontWeight: 'inherit', fontSize: 'inherit' }}>{dayStats.totalTrades}</span>
                                    </p>
                                  </div>
                                  {/* Winners */}
                                  <div>
                                    <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }} className="block">Winners</span>
                                    <p className="font-mono mt-0.5" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>
                                      <span style={{ color: '#008F67', fontWeight: 'inherit', fontSize: 'inherit' }}>{dayStats.winnersCount}</span>
                                    </p>
                                  </div>
                                  {/* Gross P&L */}
                                  <div>
                                    <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }} className="block">Gross P&L</span>
                                    <p className="font-mono mt-0.5" style={{ fontSize: '22px', fontWeight: 700, color: dayStats.grossPnl >= 0 ? '#008F67' : '#DF1C30' }}>
                                      <span style={{ color: dayStats.grossPnl >= 0 ? '#008F67' : '#DF1C30', fontWeight: 'inherit', fontSize: 'inherit' }}>{formatINR(dayStats.grossPnl)}</span>
                                    </p>
                                  </div>
                                  {/* Commissions */}
                                  <div>
                                    <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }} className="block">Commissions</span>
                                    <p className="font-mono mt-0.5 text-foreground" style={{ fontSize: '22px', fontWeight: 700 }}>
                                      <span style={{ fontWeight: 'inherit', fontSize: 'inherit' }}>{formatINR(dayStats.commissions)}</span>
                                    </p>
                                  </div>
                                  {/* Win Rate */}
                                  <div>
                                    <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }} className="block">Win Rate</span>
                                    <p className="font-mono mt-0.5 text-foreground" style={{ fontSize: '22px', fontWeight: 700 }}>
                                      <span style={{ fontWeight: 'inherit', fontSize: 'inherit' }}>{dayStats.winRate}</span>
                                    </p>
                                  </div>
                                  {/* Losers */}
                                  <div>
                                    <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }} className="block">Losers</span>
                                    <p className="font-mono mt-0.5" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>
                                      <span style={{ color: '#DF1C30', fontWeight: 'inherit', fontSize: 'inherit' }}>{dayStats.losersCount}</span>
                                    </p>
                                  </div>
                                  {/* Volume */}
                                  <div>
                                    <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }} className="block">Volume</span>
                                    <p className="font-mono mt-0.5 text-foreground" style={{ fontSize: '22px', fontWeight: 700 }}>
                                      <span style={{ fontWeight: 'inherit', fontSize: 'inherit' }}>{dayStats.volume}</span>
                                    </p>
                                  </div>
                                  {/* Profit Factor */}
                                  <div>
                                    <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }} className="block">Profit Factor</span>
                                    <p className="font-mono mt-0.5 text-foreground" style={{ fontSize: '22px', fontWeight: 700 }}>
                                      <span style={{ fontWeight: 'inherit', fontSize: 'inherit' }}>{dayStats.profitFactor}</span>
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* SECTION 3 — Trade table */}
                              <div style={{ marginTop: '5px' }}>
                                <h4 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, textTransform: 'none' }} className="font-display mb-2">
                                  Trade List
                                </h4>
                                <div className="overflow-x-auto" style={{ border: '1px solid var(--border)', borderRadius: '10px' }}>
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr style={{ backgroundColor: 'var(--bar)', borderBottom: '1px solid var(--border)' }}>
                                        <th className="px-4 py-2.5" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Time</th>
                                        <th className="px-4 py-2.5" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Symbol</th>
                                        <th className="px-4 py-2.5" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Dir</th>
                                        <th className="px-4 py-2.5" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Setup</th>
                                        <th className="px-4 py-2.5" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Qty</th>
                                        <th className="px-4 py-2.5" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Net P&L</th>
                                        <th className="px-4 py-2.5" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>R</th>
                                        <th className="px-4 py-2.5" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Execution</th>
                                        <th className="px-4 py-2.5" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Hold</th>
                                        <th className="px-4 py-2.5" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Result</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dayTrades.map((t) => {
                                        return (
                                          <tr
                                            key={t.id}
                                            onClick={() => navigate(`/trade/${t.id}`)}
                                            className="hover:bg-[rgba(0,0,0,0.025)] transition-colors cursor-pointer"
                                            style={{ borderBottom: '1px solid var(--border)' }}
                                          >
                                            {/* Column 1 - Time */}
                                            <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text)' }}>
                                              {t.entry_time ? t.entry_time.slice(0, 5) : '—'}
                                            </td>

                                            {/* Column 2 - Symbol */}
                                            <td className="px-4 py-2.5 font-semibold text-xs" style={{ color: 'var(--text)' }}>
                                              {t.symbol}
                                            </td>

                                            {/* Column 3 - Dir */}
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                              <span
                                                style={{
                                                  backgroundColor: t.direction === 'SHORT' ? '#DF1C30' : '#008F67',
                                                  color: '#ffffff',
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
                                            <td className="px-4 py-2.5 font-mono">
                                              <span style={{ color: (t.pnl || 0) >= 0 ? '#008F67' : '#DF1C30', fontWeight: 600 }}>
                                                {t.pnl !== null ? formatINR(t.pnl) : '—'}
                                              </span>
                                            </td>

                                            {/* Column 7 - R */}
                                            <td className="px-4 py-2.5 font-mono">
                                              {t.r_multiple !== null && t.r_multiple !== undefined ? (
                                                <span style={{ color: t.r_multiple >= 0 ? '#008F67' : '#DF1C30', fontWeight: 600 }}>
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
                                                      (t.execution_status === 'BEST TRADE' || t.execution_status === 'GOOD TRADE')
                                                        ? '#008F67'
                                                        : (t.execution_status === 'POOR TRADE' || t.execution_status === 'BAD TRADE')
                                                        ? '#DF1C30'
                                                        : t.execution_status === 'AVERAGE TRADE'
                                                        ? 'rgba(234,179,8,0.12)'
                                                        : '#DF1C30',
                                                    color:
                                                      (t.execution_status === 'BEST TRADE' || t.execution_status === 'GOOD TRADE' || t.execution_status === 'POOR TRADE' || t.execution_status === 'BAD TRADE')
                                                        ? '#ffffff'
                                                        : t.execution_status === 'AVERAGE TRADE'
                                                        ? '#ca8a04'
                                                        : '#ffffff',
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
                                                <span style={{ backgroundColor: '#008F67', color: '#ffffff' }} className="px-2 py-0.5 text-[10px] font-extrabold rounded">
                                                  WIN
                                                </span>
                                              )}
                                              {t.status === 'Loss' && (
                                                <span style={{ backgroundColor: '#DF1C30', color: '#ffffff' }} className="px-2 py-0.5 text-[10px] font-extrabold rounded">
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
                    style={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'
                    }}
                    className="p-4 sticky top-6 select-none"
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
                        const isSelected = dayObj.dateStr === highlightedDay;

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
                          border: isSelected
                            ? '2px solid var(--accent)'
                            : isToday
                            ? '1.5px dashed var(--accent)'
                            : '1px solid transparent',
                          boxShadow: isSelected ? '0 0 10px rgba(99, 102, 241, 0.25)' : 'none',
                        };

                        if (hasTrades) {
                          cellStyle.backgroundColor = isProfitable
                            ? 'rgba(0, 143, 103, 0.15)'
                            : isLoss
                            ? 'rgba(223, 28, 48, 0.15)'
                            : 'rgba(255, 255, 255, 0.08)';
                          cellStyle.color = isProfitable
                            ? '#008F67'
                            : isLoss
                            ? '#DF1C30'
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
                                  backgroundColor: isProfitable ? '#008F67' : isLoss ? '#DF1C30' : '#a1a1aa',
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
