import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import {
  Menu,
  Calendar as CalendarIcon,
  Filter,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Clock,
  Award,
  Zap,
  Tag,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid
} from 'recharts';
import { formatINR, MONTH_NAMES } from '../lib/calculations';

function getDayChartConfig(dayChartData: any[]) {
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
}

export const AdvancedReports: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DETAILED' | 'RISK' | 'WINS_LOSSES' | 'MARKET_BEHAVIOR' | 'CALENDAR'>('OVERVIEW');

  // Date Range (default: first day of current year to today)
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState<string>(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Calendar Year state
  const [calendarYear, setCalendarYear] = useState<number>(() => {
    return new Date(fromDate).getFullYear() || currentYear;
  });

  // State
  const [trades, setTrades] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [calendarTrades, setCalendarTrades] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Safety Redirection for Auth
  useEffect(() => {
    if (!authLoading && !userId) {
      navigate('/login');
    }
  }, [userId, authLoading, navigate]);

  // Sync calendarYear state when fromDate year changes
  useEffect(() => {
    if (fromDate) {
      const parsedYear = new Date(fromDate).getFullYear();
      if (!isNaN(parsedYear)) {
        setCalendarYear(parsedYear);
      }
    }
  }, [fromDate]);

  // Fetch Trades based on date range
  useEffect(() => {
    if (!userId) return;

    const fetchReportData = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('trades')
          .select('*, strategies(name, type_of_strategy)')
          .eq('user_id', userId)
          .gte('date', fromDate)
          .lte('date', toDate)
          .order('date', { ascending: true });

        if (error) throw error;
        setTrades(data || []);
      } catch (err: any) {
        console.error('Error fetching advanced report trades:', err);
        showError(err.message || 'Failed to sync your advanced report trades.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [userId, fromDate, toDate, showError]);

  // Fetch Year Trades for Calendar
  useEffect(() => {
    if (!userId) return;

    const fetchCalendarData = async () => {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*, strategies(name, type_of_strategy)')
          .eq('user_id', userId)
          .eq('year', calendarYear);

        if (error) throw error;
        setCalendarTrades(data || []);
      } catch (err: any) {
        console.error('Error fetching calendar trades:', err);
      }
    };

    fetchCalendarData();
  }, [userId, calendarYear]);

  // JavaScript calculations for active tab = OVERVIEW
  const overviewStats = useMemo(() => {
    if (trades.length === 0) {
      return {
        bestMonth: { label: '—', sum: 0 },
        worstMonth: { label: '—', sum: 0 },
        monthlyAvg: 0,
        // Left col
        totalPnl: 0,
        avgWin: 0,
        avgLoss: 0,
        totalTrades: 0,
        winTradesCount: 0,
        lossTradesCount: 0,
        beTradesCount: 0,
        maxConsecWins: 0,
        maxConsecLosses: 0,
        totalFees: 0,
        totalSwap: 0,
        largestWin: 0,
        largestLoss: 0,
        avgHoldTimeAll: 0,
        avgHoldTimeWins: 0,
        avgHoldTimeLosses: 0,
        // Right col
        profitFactor: '0.00',
        avgTradePnl: 0,
        avgR: 0,
        expectancy: 0,
        winRate: '0.0%',
        totalDays: 0,
        winDaysCount: 0,
        lossDaysCount: 0,
        beDaysCount: 0,
        maxConsecWinDays: 0,
        maxConsecLossDays: 0,
        avgDailyPnl: 0,
        largestWinDay: 0,
        largestLossDay: 0,
        bestSetup: '—',
        mostCommonMistake: '—'
      };
    }

    // Sort sortedByDate ascending for streaks
    const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date));

    // Best / Worst / Avg Month calculations
    const monthlyPnls: { [key: string]: { sum: number; label: string } } = {};
    trades.forEach(t => {
      if (!t.date) return;
      const dateParts = t.date.split('-');
      if (dateParts.length < 2) return;
      const y = dateParts[0];
      const mIdx = parseInt(dateParts[1], 10) - 1;
      const monthLabel = MONTH_NAMES[mIdx] || 'Jan';
      const key = `${y}-${dateParts[1]}`;
      if (!monthlyPnls[key]) {
        monthlyPnls[key] = { sum: 0, label: `${monthLabel} ${y}` };
      }
      monthlyPnls[key].sum += (t.pnl || 0);
    });

    const monthlyGroups = Object.values(monthlyPnls);
    let bestMonth = { label: '—', sum: 0 };
    let worstMonth = { label: '—', sum: 0 };
    let monthlyAvgVal = 0;

    if (monthlyGroups.length > 0) {
      bestMonth = monthlyGroups.reduce((best, cur) => cur.sum > best.sum ? cur : best, { sum: -Infinity, label: '—' });
      worstMonth = monthlyGroups.reduce((worst, cur) => cur.sum < worst.sum ? cur : worst, { sum: Infinity, label: '—' });
      const totalSum = monthlyGroups.reduce((acc, cur) => acc + cur.sum, 0);
      monthlyAvgVal = totalSum / monthlyGroups.length;
    }

    // Trade filter stats
    const winsList = sortedTrades.filter(t => t.status === 'Win');
    const lossesList = sortedTrades.filter(t => t.status === 'Loss');
    const breakevensList = sortedTrades.filter(t => t.status === 'Breakeven');

    const totalPnl = sortedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winsSum = winsList.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const lossesSum = lossesList.reduce((sum, t) => sum + (t.pnl || 0), 0);

    const avgWin = winsList.length > 0 ? winsSum / winsList.length : 0;
    const avgLoss = lossesList.length > 0 ? lossesSum / lossesList.length : 0;

    const totalTrades = sortedTrades.length;
    const winTradesCount = winsList.length;
    const lossTradesCount = lossesList.length;
    const beTradesCount = breakevensList.length;

    // Streaks
    let maxConsecWins = 0;
    let curConsecWins = 0;
    sortedTrades.forEach(t => {
      if (t.status === 'Win') {
        curConsecWins++;
        maxConsecWins = Math.max(maxConsecWins, curConsecWins);
      } else {
        curConsecWins = 0;
      }
    });

    let maxConsecLosses = 0;
    let curConsecLosses = 0;
    sortedTrades.forEach(t => {
      if (t.status === 'Loss') {
        curConsecLosses++;
        maxConsecLosses = Math.max(maxConsecLosses, curConsecLosses);
      } else {
        curConsecLosses = 0;
      }
    });

    const totalFees = sortedTrades.reduce((sum, t) => sum + (t.fees || 0), 0);
    const totalSwap = sortedTrades.reduce((sum, t) => sum + (parseFloat((t as any).swap) || 0), 0);

    const largestWin = winsList.length > 0 ? Math.max(...winsList.map(t => t.pnl || 0)) : 0;
    const largestLoss = lossesList.length > 0 ? Math.min(...lossesList.map(t => t.pnl || 0)) : 0;

    // Hold times
    const holdTimesAll = sortedTrades.map(t => t.holding_time_mins).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const holdTimesWins = winsList.map(t => t.holding_time_mins).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const holdTimesLosses = lossesList.map(t => t.holding_time_mins).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

    const avgHoldTimeAll = holdTimesAll.length > 0 ? holdTimesAll.reduce((s, x) => s + x, 0) / holdTimesAll.length : 0;
    const avgHoldTimeWins = holdTimesWins.length > 0 ? holdTimesWins.reduce((s, x) => s + x, 0) / holdTimesWins.length : 0;
    const avgHoldTimeLosses = holdTimesLosses.length > 0 ? holdTimesLosses.reduce((s, x) => s + x, 0) / holdTimesLosses.length : 0;

    // Right Column — Day & Performance stats
    const absLossesSum = Math.abs(lossesSum);
    const profitFactor = absLossesSum > 0 ? (winsSum / absLossesSum).toFixed(2) : (winsSum > 0 ? '99.00' : '0.00');

    const avgTradePnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

    const rMultipleTrades = sortedTrades.filter(t => t.r_multiple != null);
    const avgR = rMultipleTrades.length > 0 ? rMultipleTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / rMultipleTrades.length : 0;

    const pWin = totalTrades > 0 ? winTradesCount / totalTrades : 0;
    const pLoss = totalTrades > 0 ? lossTradesCount / totalTrades : 0;
    const expectancy = (pWin * avgWin) + (pLoss * avgLoss);

    const winRate = totalTrades > 0 ? `${((winTradesCount / totalTrades) * 100).toFixed(1)}%` : '0.0%';

    // Daily Groups
    const dailyMap: { [key: string]: { date: string; pnl: number } } = {};
    sortedTrades.forEach(t => {
      if (!t.date) return;
      if (!dailyMap[t.date]) {
        dailyMap[t.date] = { date: t.date, pnl: 0 };
      }
      dailyMap[t.date].pnl += (t.pnl || 0);
    });

    const dailyList = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const totalDays = dailyList.length;
    const winDaysCount = dailyList.filter(d => d.pnl > 0).length;
    const lossDaysCount = dailyList.filter(d => d.pnl < 0).length;
    const beDaysCount = dailyList.filter(d => d.pnl === 0).length;

    // Consecutive win/loss days
    let maxConsecWinDays = 0;
    let curConsecWinDays = 0;
    dailyList.forEach(d => {
      if (d.pnl > 0) {
        curConsecWinDays++;
        maxConsecWinDays = Math.max(maxConsecWinDays, curConsecWinDays);
      } else {
        curConsecWinDays = 0;
      }
    });

    let maxConsecLossDays = 0;
    let curConsecLossDays = 0;
    dailyList.forEach(d => {
      if (d.pnl < 0) {
        curConsecLossDays++;
        maxConsecLossDays = Math.max(maxConsecLossDays, curConsecLossDays);
      } else {
        curConsecLossDays = 0;
      }
    });

    const avgDailyPnl = totalDays > 0 ? dailyList.reduce((sum, d) => sum + d.pnl, 0) / totalDays : 0;

    const largestWinDay = dailyList.length > 0 ? Math.max(...dailyList.map(d => d.pnl), 0) : 0;
    const largestLossDay = dailyList.length > 0 ? Math.min(...dailyList.map(d => d.pnl), 0) : 0;

    // Best setup
    const setupPnls: { [key: string]: number } = {};
    sortedTrades.forEach(t => {
      const name = t.strategies?.name || 'No Strategy';
      setupPnls[name] = (setupPnls[name] || 0) + (t.pnl || 0);
    });

    let bestSetup = '—';
    let bestPnl = -Infinity;
    Object.entries(setupPnls).forEach(([name, sum]) => {
      if (sum > bestPnl) {
        bestPnl = sum;
        bestSetup = name;
      }
    });
    if (Object.keys(setupPnls).length === 0) bestSetup = '—';

    // Most common mistake
    const mistakeCounts: { [key: string]: number } = {};
    sortedTrades.forEach(t => {
      const text = t.mistake_text;
      if (text && text.trim() !== '') {
        mistakeCounts[text] = (mistakeCounts[text] || 0) + 1;
      }
    });

    let mostCommonMistake = '—';
    let maxMistakeCount = 0;
    Object.entries(mistakeCounts).forEach(([text, count]) => {
      if (count > maxMistakeCount) {
        maxMistakeCount = count;
        mostCommonMistake = text;
      }
    });

    return {
      bestMonth,
      worstMonth,
      monthlyAvg: monthlyAvgVal,
      // Left
      totalPnl,
      avgWin,
      avgLoss,
      totalTrades,
      winTradesCount,
      lossTradesCount,
      beTradesCount,
      maxConsecWins,
      maxConsecLosses,
      totalFees,
      totalSwap,
      largestWin,
      largestLoss,
      avgHoldTimeAll,
      avgHoldTimeWins,
      avgHoldTimeLosses,
      // Right
      profitFactor,
      avgTradePnl,
      avgR,
      expectancy,
      winRate,
      totalDays,
      winDaysCount,
      lossDaysCount,
      beDaysCount,
      maxConsecWinDays,
      maxConsecLossDays,
      avgDailyPnl,
      largestWinDay,
      largestLossDay,
      bestSetup,
      mostCommonMistake
    };
  }, [trades]);

  // Months between dynamic selection
  const monthlyChartData = useMemo(() => {
    const getMonthsBetweenDates = (startStr: string, endStr: string) => {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const months = [];
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);

      let count = 0;
      while (current <= endLimit && count < 36) {
        months.push({
          year: current.getFullYear(),
          monthIdx: current.getMonth(),
          key: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
          label: start.getFullYear() === end.getFullYear()
            ? MONTH_NAMES[current.getMonth()]
            : `${MONTH_NAMES[current.getMonth()]} '${String(current.getFullYear()).slice(-2)}`
        });
        current.setMonth(current.getMonth() + 1);
        count++;
      }
      return months;
    };

    const monthRange = getMonthsBetweenDates(fromDate, toDate);
    return monthRange.map(m => {
      const monthTrades = trades.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d.getFullYear() === m.year && d.getMonth() === m.monthIdx;
      });
      const pnlSum = monthTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const count = monthTrades.length;
      return {
        name: m.label,
        pnl: parseFloat(pnlSum.toFixed(2)),
        count
      };
    });
  }, [trades, fromDate, toDate]);

  // Calendar grouping
  const calendarDailyMap = useMemo(() => {
    const map: { [key: string]: { trades: any[]; pnl: number } } = {};
    calendarTrades.forEach(t => {
      if (!t.date) return;
      if (!map[t.date]) {
        map[t.date] = { trades: [], pnl: 0 };
      }
      map[t.date].trades.push(t);
      map[t.date].pnl += (t.pnl || 0);
    });
    return map;
  }, [calendarTrades]);

  // Minute formatter helper
  const formatMins = (totalMins: number | null | undefined) => {
    if (totalMins === null || totalMins === undefined || isNaN(totalMins) || totalMins <= 0) return '—';
    const h = Math.floor(totalMins / 60);
    const m = Math.round(totalMins % 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const renderMonthCalendar = (monthIdx: number) => {
    const firstDay = new Date(calendarYear, monthIdx, 1).getDay();
    const totalDays = new Date(calendarYear, monthIdx + 1, 0).getDate();
    const prevTotalDays = new Date(calendarYear, monthIdx, 0).getDate();

    const cells = [];
    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        dayNum: prevTotalDays - i,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    // Current month days
    const todayStr = new Date().toISOString().split('T')[0];
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${calendarYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        isCurrentMonth: true,
        dateStr
      });
    }

    // Next month padding to multiple of 7
    const totalCellsNeeded = Math.ceil(cells.length / 7) * 7;
    const nextMonthPadding = totalCellsNeeded - cells.length;
    for (let d = 1; d <= nextMonthPadding; d++) {
      cells.push({
        dayNum: d,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    return (
      <div key={monthIdx} className="p-4 rounded-2xl shadow-sm transition-all hover:shadow duration-200" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
        <h3 className="text-xs font-bold mb-3 text-center uppercase tracking-wider font-mono" style={{ color: 'var(--text-sub)' }}>
          {MONTH_NAMES[monthIdx]}
        </h3>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-400 mb-1">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            const { dayNum, isCurrentMonth, dateStr } = cell;
            if (!isCurrentMonth) {
              return (
                <div key={idx} className="text-center p-1 text-[10px] text-zinc-650 font-mono select-none opacity-20">
                  {dayNum}
                </div>
              );
            }

            const dayData = calendarDailyMap[dateStr];
            const netPnl = dayData?.pnl || 0;
            const hasTrades = !!dayData;
            const isToday = dateStr === todayStr;

            let bgStyle = {};
            let textStyle: React.CSSProperties = { color: 'var(--text)' };
            let borderStyle = {};

            if (hasTrades) {
              if (netPnl > 0) {
                bgStyle = { backgroundColor: 'rgba(34, 197, 94, 0.15)' };
                textStyle = { color: '#22c55e', fontWeight: 'bold' };
              } else if (netPnl < 0) {
                bgStyle = { backgroundColor: 'rgba(239, 68, 68, 0.15)' };
                textStyle = { color: '#ef4444', fontWeight: 'bold' };
              } else {
                bgStyle = { backgroundColor: 'rgba(113, 113, 122, 0.15)' };
                textStyle = { color: 'var(--text-sub)' };
              }
            }

            if (isToday) {
              borderStyle = { border: '1.5px solid var(--accent)' };
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => hasTrades && setSelectedDate(dateStr)}
                disabled={!hasTrades}
                style={{ ...bgStyle, ...textStyle, ...borderStyle }}
                className={`text-center p-1 text-[11px] rounded transition-all font-mono ${
                  hasTrades ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default opacity-50'
                }`}
                title={hasTrades ? `${dateStr}: ${netPnl >= 0 ? '+' : ''}${formatINR(netPnl)}` : undefined}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row md:items-start font-sans selection:bg-indigo-500/30" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user?.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

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

        {/* WORKSPACE MAIN */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* PAGE HEADER & FILTERS */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight font-display text-zinc-100">
                  Reports
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Complete trading performance analytics.
                </p>
              </div>

              {/* DATE RANGE FILTER inputs */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                  <Filter className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-400">Date Range:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{ backgroundColor: 'transparent', color: 'var(--text)' }}
                    className="cursor-pointer border-none focus:outline-none text-xs font-mono font-bold"
                  />
                  <span className="text-zinc-500">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{ backgroundColor: 'transparent', color: 'var(--text)' }}
                    className="cursor-pointer border-none focus:outline-none text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* TAB SELECTOR BAR */}
            <div className="flex overflow-x-auto gap-2 p-1 rounded-2xl mb-6 font-mono no-scrollbar" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
              {[
                { id: 'OVERVIEW', label: 'OVERVIEW' },
                { id: 'DETAILED', label: 'DETAILED' },
                { id: 'RISK', label: 'RISK' },
                { id: 'WINS_LOSSES', label: 'WINS VS LOSSES' },
                { id: 'MARKET_BEHAVIOR', label: 'MARKET BEHAVIOR' },
                { id: 'CALENDAR', label: 'CALENDAR' }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className="px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: isActive ? 'var(--card)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-sub)',
                      border: isActive ? '0.5px solid var(--border)' : '0.5px solid transparent'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENTS */}
            {loading && activeTab === 'OVERVIEW' ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                <p className="text-xs text-zinc-500 mt-3 font-mono">Querying portfolio statistics...</p>
              </div>
            ) : activeTab === 'OVERVIEW' ? (
              <div className="space-y-6">
                {/* SECTION A: Three Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Card 1: BEST MONTH */}
                  <div className="p-5 rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">
                      BEST MONTH
                    </div>
                    <div className="text-2xl font-bold mt-1.5 font-mono text-green-500">
                      {formatINR(overviewStats.bestMonth.sum)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 font-sans">
                      {overviewStats.bestMonth.label === '—' ? 'None in selected period' : overviewStats.bestMonth.label}
                    </div>
                  </div>

                  {/* Card 2: WORST MONTH */}
                  <div className="p-5 rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">
                      WORST MONTH
                    </div>
                    <div className={`text-2xl font-bold mt-1.5 font-mono ${overviewStats.worstMonth.sum < 0 ? 'text-red-500' : 'text-zinc-100'}`}>
                      {formatINR(overviewStats.worstMonth.sum)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 font-sans">
                      {overviewStats.worstMonth.label === '—' ? 'None in selected period' : overviewStats.worstMonth.label}
                    </div>
                  </div>

                  {/* Card 3: MONTHLY AVERAGE */}
                  <div className="p-5 rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">
                      AVG PER MONTH
                    </div>
                    <div className={`text-2xl font-bold mt-1.5 font-mono ${overviewStats.monthlyAvg > 0 ? 'text-green-500' : overviewStats.monthlyAvg < 0 ? 'text-red-500' : 'text-zinc-100'}`}>
                      {formatINR(overviewStats.monthlyAvg)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 font-sans">
                      per month average
                    </div>
                  </div>
                </div>

                {/* SECTION B: Stats table side-by-side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column — Trade Stats */}
                  <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="flex items-center gap-2 pb-3 mb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <TrendingUp className="w-4 h-4 text-zinc-400" />
                      <h2 className="text-sm font-bold font-mono tracking-wider text-zinc-200">TRADE STATS</h2>
                    </div>

                    <div className="space-y-px text-sm">
                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Total P&L</span>
                        <span className={`font-mono font-bold ${overviewStats.totalPnl > 0 ? 'text-green-500' : overviewStats.totalPnl < 0 ? 'text-red-500' : 'text-zinc-200'}`}>
                          {formatINR(overviewStats.totalPnl)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Average Winning Trade</span>
                        <span className="font-mono font-bold text-green-500">{formatINR(overviewStats.avgWin)}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Average Losing Trade</span>
                        <span className="font-mono font-bold text-red-500">{formatINR(overviewStats.avgLoss)}</span>
                      </div>

                      <div className="my-1.5 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Total Trades</span>
                        <span className="font-mono font-bold text-zinc-200">{overviewStats.totalTrades}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Winning Trades</span>
                        <span className="font-mono font-bold text-green-500">{overviewStats.winTradesCount}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Losing Trades</span>
                        <span className="font-mono font-bold text-red-500">{overviewStats.lossTradesCount}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Breakeven Trades</span>
                        <span className="font-mono font-bold text-zinc-400">{overviewStats.beTradesCount}</span>
                      </div>

                      <div className="my-1.5 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Max Consecutive Wins</span>
                        <span className="font-mono font-bold text-green-500">+{overviewStats.maxConsecWins}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Max Consecutive Losses</span>
                        <span className="font-mono font-bold text-red-500">-{overviewStats.maxConsecLosses}</span>
                      </div>

                      <div className="my-1.5 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Total Fees</span>
                        <span className="font-mono font-bold text-zinc-200">{formatINR(overviewStats.totalFees)}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Total Swap</span>
                        <span className="font-mono font-bold text-zinc-200">{formatINR(overviewStats.totalSwap)}</span>
                      </div>

                      <div className="my-1.5 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Largest Single Profit</span>
                        <span className="font-mono font-bold text-green-500">{formatINR(overviewStats.largestWin)}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Largest Single Loss</span>
                        <span className="font-mono font-bold text-red-500">{formatINR(overviewStats.largestLoss)}</span>
                      </div>

                      <div className="my-1.5 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Avg Hold Time (All)</span>
                        <span className="font-mono font-bold text-zinc-200">{formatMins(overviewStats.avgHoldTimeAll)}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Avg Hold Time (Wins)</span>
                        <span className="font-mono font-bold text-green-500">{formatMins(overviewStats.avgHoldTimeWins)}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Avg Hold Time (Losses)</span>
                        <span className="font-mono font-bold text-red-500">{formatMins(overviewStats.avgHoldTimeLosses)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column — Day Stats */}
                  <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="flex items-center gap-2 pb-3 mb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <CalendarIcon className="w-4 h-4 text-zinc-400" />
                      <h2 className="text-sm font-bold font-mono tracking-wider text-zinc-200">DAY & GAMEPLAY STATS</h2>
                    </div>

                    <div className="space-y-px text-sm">
                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Profit Factor</span>
                        <span className={`font-mono font-bold ${parseFloat(overviewStats.profitFactor) >= 1.5 ? 'text-green-500' : parseFloat(overviewStats.profitFactor) >= 1.0 ? 'text-zinc-200' : 'text-red-500'}`}>
                          {overviewStats.profitFactor}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Average Trade P&L</span>
                        <span className={`font-mono font-bold ${overviewStats.avgTradePnl > 0 ? 'text-green-500' : overviewStats.avgTradePnl < 0 ? 'text-red-500' : 'text-zinc-200'}`}>
                          {formatINR(overviewStats.avgTradePnl)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Average R-Multiple</span>
                        <span className={`font-mono font-bold ${overviewStats.avgR >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {overviewStats.avgR >= 0 ? '+' : ''}{overviewStats.avgR.toFixed(2)}R
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Trade Expectancy</span>
                        <span className={`font-mono font-bold ${overviewStats.expectancy > 0 ? 'text-green-500' : overviewStats.expectancy < 0 ? 'text-red-500' : 'text-zinc-200'}`}>
                          {formatINR(overviewStats.expectancy)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Win Rate</span>
                        <span className="font-mono font-bold text-zinc-200">{overviewStats.winRate}</span>
                      </div>

                      <div className="my-1.5 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Total Trading Days</span>
                        <span className="font-mono font-bold text-zinc-200">{overviewStats.totalDays}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Winning Days</span>
                        <span className="font-mono font-bold text-green-500">{overviewStats.winDaysCount}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Losing Days</span>
                        <span className="font-mono font-bold text-red-500">{overviewStats.lossDaysCount}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Breakeven Days</span>
                        <span className="font-mono font-bold text-zinc-400">{overviewStats.beDaysCount}</span>
                      </div>

                      <div className="my-1.5 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Max Consecutive Win Days</span>
                        <span className="font-mono font-bold text-green-500">+{overviewStats.maxConsecWinDays} days</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Max Consecutive Loss Days</span>
                        <span className="font-mono font-bold text-red-500">-{overviewStats.maxConsecLossDays} days</span>
                      </div>

                      <div className="my-1.5 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Avg Daily P&L</span>
                        <span className={`font-mono font-bold ${overviewStats.avgDailyPnl > 0 ? 'text-green-500' : overviewStats.avgDailyPnl < 0 ? 'text-red-500' : 'text-zinc-200'}`}>
                          {formatINR(overviewStats.avgDailyPnl)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Largest Winning Day</span>
                        <span className="font-mono font-bold text-green-500">{formatINR(overviewStats.largestWinDay)}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Largest Losing Day</span>
                        <span className="font-mono font-bold text-red-500">{formatINR(overviewStats.largestLossDay)}</span>
                      </div>

                      <div className="my-1.5 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Best Setup</span>
                        <span className="font-sans font-bold text-indigo-400 truncate max-w-[150px]" title={overviewStats.bestSetup}>
                          {overviewStats.bestSetup}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors rounded">
                        <span className="text-xs text-zinc-400">Most Common Mistake</span>
                        <span className="font-sans font-bold text-zinc-300 truncate max-w-[150px]" title={overviewStats.mostCommonMistake}>
                          {overviewStats.mostCommonMistake}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION C: Two Bar Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Chart 1: Monthly P&L */}
                  <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <h3 className="text-sm font-bold font-mono tracking-wider mb-4 text-zinc-200">Monthly P&L</h3>
                    <div className="h-[260px] w-full">
                      {monthlyChartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">No data available for date range</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" />
                            <YAxis stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" />
                            <RechartsTooltip
                              formatter={(value: any) => [formatINR(value), 'Net P&L']}
                              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}
                            />
                            <Bar dataKey="pnl">
                              {monthlyChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Chart 2: Trade Count */}
                  <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <h3 className="text-sm font-bold font-mono tracking-wider mb-4 text-zinc-200">Trade Frequency</h3>
                    <div className="h-[260px] w-full">
                      {monthlyChartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">No data available for date range</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" />
                            <YAxis stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" allowDecimals={false} />
                            <RechartsTooltip
                              formatter={(value: any) => [value, 'Trades Count']}
                              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}
                            />
                            <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'CALENDAR' ? (
              <div className="space-y-6">
                {/* CALENDAR HEADER & NAVIGATION */}
                <div className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                  <div className="text-sm font-bold font-mono" style={{ color: 'var(--text-sub)' }}>
                    YEAR WORKSPACE
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setCalendarYear(prev => prev - 1)}
                      className="p-1.5 rounded-lg cursor-pointer hover:bg-zinc-800/10 dark:hover:bg-zinc-100/10"
                      style={{ color: 'var(--text-sub)' }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-base font-extrabold font-mono" style={{ color: 'var(--text)' }}>
                      {calendarYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalendarYear(prev => prev + 1)}
                      className="p-1.5 rounded-lg cursor-pointer hover:bg-zinc-800/10 dark:hover:bg-zinc-100/10"
                      style={{ color: 'var(--text-sub)' }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-24 hidden sm:block" /> {/* Spacing balance */}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs font-mono justify-center sm:justify-start" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-green-500/20 border border-green-500/40 inline-block" />
                    <span>Winning Day</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-red-500/20 border border-red-500/40 inline-block" />
                    <span>Losing Day</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-zinc-500/20 border border-zinc-500/45 inline-block" />
                    <span>Breakeven Day</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded border border-indigo-500 inline-block" />
                    <span>Today's Date</span>
                  </div>
                </div>

                {/* 12 Months Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {Array.from({ length: 12 }).map((_, monthIdx) => renderMonthCalendar(monthIdx))}
                </div>

                {/* SELECTED DATE DETAILS POPUP/PANEL */}
                {selectedDate && calendarDailyMap[selectedDate] && (
                  <div
                    className="p-5 rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300"
                    style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-extrabold font-mono text-zinc-100 uppercase tracking-wider">
                        Trades on {selectedDate} ({calendarDailyMap[selectedDate].trades.length} {calendarDailyMap[selectedDate].trades.length === 1 ? 'trade' : 'trades'})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSelectedDate(null)}
                        className="text-xs px-2.5 py-1 rounded-xl font-mono font-bold hover:bg-zinc-800/10 dark:hover:bg-zinc-100/10 cursor-pointer"
                        style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border)' }}
                      >
                        CLOSE PANEL
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }} className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                            <th className="py-2.5 px-3">Symbol</th>
                            <th className="py-2.5 px-3">Direction</th>
                            <th className="py-2.5 px-3">Setup</th>
                            <th className="py-2.5 px-3 text-right">P&L</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calendarDailyMap[selectedDate].trades.map((trade: any) => {
                            const isWin = trade.status === 'Win';
                            const isLoss = trade.status === 'Loss';
                            const pnlVal = trade.pnl || 0;

                            return (
                              <tr
                                key={trade.id}
                                onClick={() => navigate(`/trade/${trade.id}`)}
                                className="cursor-pointer hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5 transition-colors text-xs font-sans"
                                style={{ borderBottom: '0.5px solid var(--border)' }}
                              >
                                <td className="py-3 px-3 font-semibold text-zinc-200">{trade.symbol}</td>
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                    trade.direction === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                  }`}>
                                    {trade.direction || '—'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-zinc-400">{trade.strategies?.name || '—'}</td>
                                <td className={`py-3 px-3 text-right font-mono font-bold ${
                                  pnlVal > 0 ? 'text-green-500' : pnlVal < 0 ? 'text-red-500' : 'text-zinc-200'
                                }`}>
                                  {formatINR(pnlVal)}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                    isWin ? 'bg-green-500/10 text-green-500' : isLoss ? 'bg-red-500/10 text-red-500' : 'bg-zinc-500/10 text-zinc-400'
                                  }`}>
                                    {trade.status || '—'}
                                  </span>
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
            ) : (
              // PLACEHOLDERS FOR REMAINING TABS
              <div className="p-10 rounded-2xl text-center shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                <Zap className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                <h3 className="text-base font-bold font-mono text-zinc-350">Coming soon</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Detailed analytics, stress tests, win/loss breakdowns, and trade categorization is currently being built. Stay tuned!
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
