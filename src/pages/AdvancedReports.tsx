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
  HelpCircle,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  ReferenceLine,
  Legend
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

function getTimeBucket(entryTimeStr: string | null | undefined, interval: '1 Hour' | '30 Minutes' | '15 Minutes'): string | null {
  if (!entryTimeStr) return null;
  const parts = entryTimeStr.split(':');
  if (parts.length < 2) return null;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return null;

  let bucketHour = hour;
  let bucketMinute = 0;

  if (interval === '1 Hour') {
    bucketMinute = 0;
  } else if (interval === '30 Minutes') {
    bucketMinute = minute >= 30 ? 30 : 0;
  } else if (interval === '15 Minutes') {
    if (minute >= 45) bucketMinute = 45;
    else if (minute >= 30) bucketMinute = 30;
    else if (minute >= 15) bucketMinute = 15;
    else bucketMinute = 0;
  }

  return `${String(bucketHour).padStart(2, '0')}:${String(bucketMinute).padStart(2, '0')}`;
}

function getDurationBucket(mins: number | null | undefined): string | null {
  if (mins === null || mins === undefined || isNaN(mins)) return null;
  const rounded = Math.floor(mins);

  if (rounded === 0) return "Under 1 min";
  if (rounded >= 1 && rounded <= 4) return "1 to 4 min";
  if (rounded >= 5 && rounded <= 14) return "5 to 14 min";
  if (rounded >= 15 && rounded <= 29) return "15 to 29 min";
  if (rounded >= 30 && rounded <= 59) return "30 to 59 min";
  if (rounded >= 60 && rounded <= 119) return "1h to 1h 59m";
  if (rounded >= 120 && rounded <= 239) return "2h to 3h 59m";
  if (rounded >= 240) return "4h and over";
  return null;
}

const RMULTIPLE_ORDER = [
  "-4R or less",
  "-3R to -3.99R",
  "-2R to -2.99R",
  "-1R to -1.99R",
  "-0.99R to -0.01R",
  "0R to 0.99R",
  "+1R to +1.99R",
  "+2R to +2.99R",
  "+3R to +3.99R",
  "+4R and more"
];

function getRMultipleBucket(r: number | null | undefined): string | null {
  if (r === null || r === undefined || isNaN(r)) return null;
  if (r <= -4) return "-4R or less";
  if (r >= -3.99 && r <= -3) return "-3R to -3.99R";
  if (r >= -2.99 && r <= -2) return "-2R to -2.99R";
  if (r >= -1.99 && r <= -1) return "-1R to -1.99R";
  if (r >= -0.99 && r < 0) return "-0.99R to -0.01R";
  if (r >= 0 && r <= 0.99) return "0R to 0.99R";
  if (r >= 1 && r <= 1.99) return "+1R to +1.99R";
  if (r >= 2 && r <= 2.99) return "+2R to +2.99R";
  if (r >= 3 && r <= 3.99) return "+3R to +3.99R";
  if (r >= 4) return "+4R and more";
  return null;
}

const FOREX_QUANTITY_ORDER = [
  "0.01 to 0.09",
  "0.10 to 0.49",
  "0.50 to 0.99",
  "1.00 to 2.99",
  "3.00 and over"
];

const FO_QUANTITY_ORDER = [
  "1 lot or less",
  "2 to 5 lots",
  "6 to 10 lots",
  "11 to 20 lots",
  "21 to 50 lots",
  "51 lots and over"
];

function getPositionSizeBucket(q: number | null | undefined, isForex: boolean): string | null {
  if (q === null || q === undefined || isNaN(q) || q <= 0) return null;
  if (isForex) {
    if (q >= 0.01 && q <= 0.09) return "0.01 to 0.09";
    if (q >= 0.10 && q <= 0.49) return "0.10 to 0.49";
    if (q >= 0.50 && q <= 0.99) return "0.50 to 0.99";
    if (q >= 1.00 && q <= 2.99) return "1.00 to 2.99";
    if (q >= 3.00) return "3.00 and over";
  } else {
    if (q <= 1) return "1 lot or less";
    if (q > 1 && q <= 5) return "2 to 5 lots";
    if (q > 5 && q <= 10) return "6 to 10 lots";
    if (q > 10 && q <= 20) return "11 to 20 lots";
    if (q > 20 && q <= 50) return "21 to 50 lots";
    if (q > 50) return "51 lots and over";
  }
  return null;
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

  // Detailed tab sub-filters state
  const [detailedSubFilter, setDetailedSubFilter] = useState<'DAYS' | 'MONTHS' | 'TIME' | 'DURATION' | 'SYMBOL' | 'SETUPS' | 'MISTAKES'>('DAYS');
  const [detailedTimeInterval, setDetailedTimeInterval] = useState<'1 Hour' | '30 Minutes' | '15 Minutes'>('1 Hour');
  const [detailedMistakeClass, setDetailedMistakeClass] = useState<'BY TYPE' | 'BY SPECIFIC MISTAKE'>('BY TYPE');

  // Risk tab sub-filters state
  const [riskSubFilter, setRiskSubFilter] = useState<'R-MULTIPLE' | 'POSITION_SIZE'>('R-MULTIPLE');

  // Market Behavior sub-filter state
  const [marketBehaviorSubFilter, setMarketBehaviorSubFilter] = useState<'OPENING_CONDITION' | 'HOURLY_TREND' | 'PHASE_PO3' | 'TREND_POSITION'>('OPENING_CONDITION');

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

  interface GroupedStat {
    name: string;
    count: number;
    netPnl: number;
    totalProfit: number;
    totalLoss: number;
    wins: number;
    winPct: number;
  }

  const detailedData: GroupedStat[] = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    if (detailedSubFilter === 'DAYS') {
      const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const DAY_INDEX_MAP: Record<number, string> = {
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday',
        0: 'Sunday'
      };

      const groups: Record<string, any[]> = {};
      DAYS_ORDER.forEach(d => { groups[d] = []; });

      trades.forEach(t => {
        if (!t.date) return;
        const parts = t.date.split('-');
        if (parts.length < 3) return;
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return;
        const d = new Date(year, month - 1, day);
        const dayIndex = d.getDay();
        const dayName = DAY_INDEX_MAP[dayIndex];
        if (dayName && groups[dayName]) {
          groups[dayName].push(t);
        }
      });

      return DAYS_ORDER.map(name => {
        const gTrades = groups[name];
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });
    }

    if (detailedSubFilter === 'MONTHS') {
      const groups: Record<string, any[]> = {};
      MONTH_NAMES.forEach(m => { groups[m] = []; });

      trades.forEach(t => {
        if (!t.date) return;
        const parts = t.date.split('-');
        if (parts.length < 2) return;
        const mIdx = parseInt(parts[1], 10) - 1;
        const monthLabel = MONTH_NAMES[mIdx];
        if (monthLabel && groups[monthLabel]) {
          groups[monthLabel].push(t);
        }
      });

      return MONTH_NAMES.map(name => {
        const gTrades = groups[name];
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });
    }

    if (detailedSubFilter === 'TIME') {
      const groups: Record<string, any[]> = {};
      trades.forEach(t => {
        const bucket = getTimeBucket(t.entry_time, detailedTimeInterval);
        if (!bucket) return;
        if (!groups[bucket]) groups[bucket] = [];
        groups[bucket].push(t);
      });

      const sortedBuckets = Object.keys(groups).sort();
      return sortedBuckets.map(name => {
        const gTrades = groups[name];
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });
    }

    if (detailedSubFilter === 'DURATION') {
      const DURATION_ORDER = [
        "Under 1 min",
        "1 to 4 min",
        "5 to 14 min",
        "15 to 29 min",
        "30 to 59 min",
        "1h to 1h 59m",
        "2h to 3h 59m",
        "4h and over"
      ];

      const groups: Record<string, any[]> = {};
      DURATION_ORDER.forEach(d => { groups[d] = []; });

      trades.forEach(t => {
        const bucket = getDurationBucket(t.holding_time_mins);
        if (!bucket) return;
        if (groups[bucket]) {
          groups[bucket].push(t);
        }
      });

      return DURATION_ORDER.filter(d => groups[d].length > 0).map(name => {
        const gTrades = groups[name];
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });
    }

    if (detailedSubFilter === 'SYMBOL') {
      const groups: Record<string, any[]> = {};
      trades.forEach(t => {
        if (!t.symbol) return;
        const name = t.symbol.trim().toUpperCase();
        if (!groups[name]) groups[name] = [];
        groups[name].push(t);
      });

      const result = Object.entries(groups).map(([name, gTrades]) => {
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });

      result.sort((a, b) => b.count - a.count);
      return result.slice(0, 15);
    }

    if (detailedSubFilter === 'SETUPS') {
      const groups: Record<string, any[]> = {};
      trades.forEach(t => {
        const name = t.strategies?.name || 'No Setup';
        if (!groups[name]) groups[name] = [];
        groups[name].push(t);
      });

      const result = Object.entries(groups).map(([name, gTrades]) => {
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });

      result.sort((a, b) => b.netPnl - a.netPnl);
      return result;
    }

    if (detailedSubFilter === 'MISTAKES') {
      const groups: Record<string, any[]> = {};

      if (detailedMistakeClass === 'BY TYPE') {
        const types = ['Technical', 'Psychological', 'Risk Management', 'No Mistake'];
        types.forEach(type => { groups[type] = []; });

        trades.forEach(t => {
          const type = t.mistake_type || 'No Mistake';
          if (groups[type]) {
            groups[type].push(t);
          } else {
            groups['No Mistake'].push(t);
          }
        });
      } else {
        trades.forEach(t => {
          const text = t.mistake_text ? t.mistake_text.trim() : '';
          const name = text === '' ? 'No Mistake' : text;
          if (!groups[name]) groups[name] = [];
          groups[name].push(t);
        });
      }

      const result = Object.entries(groups).map(([name, gTrades]) => {
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });

      if (detailedMistakeClass === 'BY SPECIFIC MISTAKE') {
        result.sort((a, b) => b.count - a.count);
      }

      return result;
    }

    return [];
  }, [trades, detailedSubFilter, detailedTimeInterval, detailedMistakeClass]);

  const riskData: GroupedStat[] = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    if (riskSubFilter === 'R-MULTIPLE') {
      const filtered = trades.filter(t => t.r_multiple !== null && t.r_multiple !== undefined);
      const groups: Record<string, any[]> = {};
      RMULTIPLE_ORDER.forEach(b => { groups[b] = []; });

      filtered.forEach(t => {
        const bucket = getRMultipleBucket(t.r_multiple);
        if (bucket && groups[bucket]) {
          groups[bucket].push(t);
        }
      });

      return RMULTIPLE_ORDER.filter(b => groups[b].length > 0).map(name => {
        const gTrades = groups[name];
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });
    } else {
      // POSITION SIZE
      const filtered = trades.filter(t => t.quantity !== null && t.quantity !== undefined);
      const isForex = filtered.some(t => t.quantity > 0 && t.quantity < 1);
      const bucketsOrder = isForex ? FOREX_QUANTITY_ORDER : FO_QUANTITY_ORDER;

      const groups: Record<string, any[]> = {};
      bucketsOrder.forEach(b => { groups[b] = []; });

      filtered.forEach(t => {
        const bucket = getPositionSizeBucket(t.quantity, isForex);
        if (bucket && groups[bucket]) {
          groups[bucket].push(t);
        }
      });

      return bucketsOrder.filter(b => groups[b].length > 0).map(name => {
        const gTrades = groups[name];
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });
    }
  }, [trades, riskSubFilter]);

  const winsLossesStats = useMemo(() => {
    const winTrades = trades.filter(t => t.status === 'Win');
    const lossTrades = trades.filter(t => t.status === 'Loss');

    // Total Count
    const totalCountWins = winTrades.length;
    const totalCountLosses = lossTrades.length;

    // Total PnL
    const totalPnlWins = winTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalPnlLosses = lossTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    // Average Per Trade
    const avgPnlWins = totalCountWins > 0 ? totalPnlWins / totalCountWins : 0;
    const avgPnlLosses = totalCountLosses > 0 ? totalPnlLosses / totalCountLosses : 0;

    // Average R-Multiple
    const winsWithR = winTrades.filter(t => t.r_multiple !== null && t.r_multiple !== undefined);
    const avgRMultipleWins = winsWithR.length > 0 ? winsWithR.reduce((sum, t) => sum + t.r_multiple, 0) / winsWithR.length : null;

    const lossesWithR = lossTrades.filter(t => t.r_multiple !== null && t.r_multiple !== undefined);
    const avgRMultipleLosses = lossesWithR.length > 0 ? lossesWithR.reduce((sum, t) => sum + t.r_multiple, 0) / lossesWithR.length : null;

    // Average Hold Time
    const winsWithHold = winTrades.filter(t => t.holding_time_mins !== null && t.holding_time_mins !== undefined && !isNaN(t.holding_time_mins) && t.holding_time_mins > 0);
    const avgHoldWins = winsWithHold.length > 0 ? winsWithHold.reduce((sum, t) => sum + t.holding_time_mins, 0) / winsWithHold.length : null;

    const lossesWithHold = lossTrades.filter(t => t.holding_time_mins !== null && t.holding_time_mins !== undefined && !isNaN(t.holding_time_mins) && t.holding_time_mins > 0);
    const avgHoldLosses = lossesWithHold.length > 0 ? lossesWithHold.reduce((sum, t) => sum + t.holding_time_mins, 0) / lossesWithHold.length : null;

    // Largest
    const largestWin = winTrades.length > 0 ? Math.max(...winTrades.map(t => t.pnl || 0)) : 0;
    const largestLoss = lossTrades.length > 0 ? Math.min(...lossTrades.map(t => t.pnl || 0)) : 0;

    // Most Common Setup
    const winSetupCounts: Record<string, number> = {};
    winTrades.forEach(t => {
      const setupName = t.strategies?.name || 'No Setup';
      winSetupCounts[setupName] = (winSetupCounts[setupName] || 0) + 1;
    });
    let topWinSetup = '—';
    let maxWinSetupCount = 0;
    Object.entries(winSetupCounts).forEach(([setup, count]) => {
      if (count > maxWinSetupCount) {
        maxWinSetupCount = count;
        topWinSetup = setup;
      }
    });

    const lossSetupCounts: Record<string, number> = {};
    lossTrades.forEach(t => {
      const setupName = t.strategies?.name || 'No Setup';
      lossSetupCounts[setupName] = (lossSetupCounts[setupName] || 0) + 1;
    });
    let topLossSetup = '—';
    let maxLossSetupCount = 0;
    Object.entries(lossSetupCounts).forEach(([setup, count]) => {
      if (count > maxLossSetupCount) {
        maxLossSetupCount = count;
        topLossSetup = setup;
      }
    });

    // Most Common Mistake
    const winMistakeCounts: Record<string, number> = {};
    winTrades.forEach(t => {
      const mistake = t.mistake_text ? t.mistake_text.trim() : (t.mistake_type ? t.mistake_type.trim() : '');
      if (mistake) {
        winMistakeCounts[mistake] = (winMistakeCounts[mistake] || 0) + 1;
      }
    });
    let topWinMistake = 'None';
    let maxWinMistakeCount = 0;
    Object.entries(winMistakeCounts).forEach(([mistake, count]) => {
      if (count > maxWinMistakeCount) {
        maxWinMistakeCount = count;
        topWinMistake = mistake;
      }
    });

    const lossMistakeCounts: Record<string, number> = {};
    lossTrades.forEach(t => {
      const mistake = t.mistake_text ? t.mistake_text.trim() : (t.mistake_type ? t.mistake_type.trim() : '');
      if (mistake) {
        lossMistakeCounts[mistake] = (lossMistakeCounts[mistake] || 0) + 1;
      }
    });
    let topLossMistake = 'None';
    let maxLossMistakeCount = 0;
    Object.entries(lossMistakeCounts).forEach(([mistake, count]) => {
      if (count > maxLossMistakeCount) {
        maxLossMistakeCount = count;
        topLossMistake = mistake;
      }
    });

    return {
      totalCountWins,
      totalCountLosses,
      totalPnlWins,
      totalPnlLosses,
      avgPnlWins,
      avgPnlLosses,
      avgRMultipleWins,
      avgRMultipleLosses,
      avgHoldWins,
      avgHoldLosses,
      largestWin,
      largestLoss,
      topWinSetup,
      topLossSetup,
      topWinMistake,
      topLossMistake
    };
  }, [trades]);

  const winsLossesBySetup = useMemo(() => {
    const setupMap: Record<string, { name: string; wins: number; losses: number }> = {};
    trades.forEach(t => {
      const setupName = t.strategies?.name || 'No Setup';
      if (!setupMap[setupName]) {
        setupMap[setupName] = { name: setupName, wins: 0, losses: 0 };
      }
      if (t.status === 'Win') {
        setupMap[setupName].wins += 1;
      } else if (t.status === 'Loss') {
        setupMap[setupName].losses += 1;
      }
    });
    return Object.values(setupMap).filter(item => item.wins > 0 || item.losses > 0);
  }, [trades]);

  const winsLossesByDay = useMemo(() => {
    const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const DAY_INDEX_MAP: Record<number, string> = {
      1: 'Mon',
      2: 'Tue',
      3: 'Wed',
      4: 'Thu',
      5: 'Fri',
      6: 'Sat',
      0: 'Sun'
    };

    const dayMap: Record<string, { name: string; wins: number; losses: number }> = {};
    DAYS_SHORT.forEach(d => {
      dayMap[d] = { name: d, wins: 0, losses: 0 };
    });

    trades.forEach(t => {
      if (!t.date) return;
      const parts = t.date.split('-');
      if (parts.length < 3) return;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return;
      const d = new Date(year, month - 1, day);
      const dayName = DAY_INDEX_MAP[d.getDay()];
      if (dayName && dayMap[dayName]) {
        if (t.status === 'Win') {
          dayMap[dayName].wins += 1;
        } else if (t.status === 'Loss') {
          dayMap[dayName].losses += 1;
        }
      }
    });

    return DAYS_SHORT.map(d => dayMap[d]);
  }, [trades]);

  const winsLossesByTime = useMemo(() => {
    const timeMap: Record<string, { name: string; wins: number; losses: number }> = {};
    trades.forEach(t => {
      const bucket = getTimeBucket(t.entry_time, '1 Hour');
      if (!bucket) return;
      if (!timeMap[bucket]) {
        timeMap[bucket] = { name: bucket, wins: 0, losses: 0 };
      }
      if (t.status === 'Win') {
        timeMap[bucket].wins += 1;
      } else if (t.status === 'Loss') {
        timeMap[bucket].losses += 1;
      }
    });
    return Object.keys(timeMap).sort().map(key => timeMap[key]);
  }, [trades]);

  const setupBreakdown = useMemo(() => {
    const setupMap: Record<string, {
      name: string;
      trades: number;
      wins: number;
      losses: number;
      totalWinPnl: number;
      totalLossPnl: number;
      netPnl: number;
    }> = {};

    trades.forEach(t => {
      const setupName = t.strategies?.name || 'No Setup';
      if (!setupMap[setupName]) {
        setupMap[setupName] = {
          name: setupName,
          trades: 0,
          wins: 0,
          losses: 0,
          totalWinPnl: 0,
          totalLossPnl: 0,
          netPnl: 0
        };
      }
      const item = setupMap[setupName];
      item.trades += 1;
      item.netPnl += (t.pnl || 0);
      if (t.status === 'Win') {
        item.wins += 1;
        item.totalWinPnl += (t.pnl || 0);
      } else if (t.status === 'Loss') {
        item.losses += 1;
        item.totalLossPnl += (t.pnl || 0);
      }
    });

    const list = Object.values(setupMap).map(item => {
      const winRate = item.trades > 0 ? (item.wins / item.trades) * 100 : 0;
      const avgWin = item.wins > 0 ? item.totalWinPnl / item.wins : 0;
      const avgLoss = item.losses > 0 ? item.totalLossPnl / item.losses : 0;
      return {
        name: item.name,
        trades: item.trades,
        wins: item.wins,
        losses: item.losses,
        winRate,
        avgWin,
        avgLoss,
        netPnl: item.netPnl
      };
    });

    return list.sort((a, b) => b.netPnl - a.netPnl);
  }, [trades]);

  const showMarketBehaviorDataQualityBanner = useMemo(() => {
    if (!trades || trades.length === 0) return false;
    const total = trades.length;

    const notRecordedCounts = {
      opening_condition: trades.filter(t => !t.opening_condition || String(t.opening_condition).trim() === '').length,
      hourly_trend: trades.filter(t => !t.hourly_trend || String(t.hourly_trend).trim() === '').length,
      phase: trades.filter(t => !t.phase || String(t.phase).trim() === '').length,
      trend_position: trades.filter(t => !t.trend_position || String(t.trend_position).trim() === '').length,
    };

    const threshold = 0.20 * total;
    return (
      notRecordedCounts.opening_condition > threshold ||
      notRecordedCounts.hourly_trend > threshold ||
      notRecordedCounts.phase > threshold ||
      notRecordedCounts.trend_position > threshold
    );
  }, [trades]);

  const marketBehaviorDataAndInsights = useMemo(() => {
    if (!trades || trades.length === 0) {
      return { data: [], insights: { best: '—', mostCommon: '—', extra: '' }, hasNoData: true };
    }

    let list: any[] = [];
    let hasNoData = false;

    if (marketBehaviorSubFilter === 'OPENING_CONDITION') {
      const groups: Record<string, any[]> = {};
      trades.forEach(t => {
        const val = t.opening_condition && String(t.opening_condition).trim() !== '' 
          ? String(t.opening_condition).trim() 
          : 'Not Recorded';
        if (!groups[val]) groups[val] = [];
        groups[val].push(t);
      });

      list = Object.entries(groups).map(([name, gTrades]) => {
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });

      list.sort((a, b) => b.count - a.count);

      const nonNotRecordedCount = list.filter(g => g.name !== 'Not Recorded' && g.count > 0).length;
      hasNoData = nonNotRecordedCount === 0;

      const validForBest = list.filter(g => g.name !== 'Not Recorded' && g.netPnl > 0);
      const bestItem = validForBest.length > 0 ? [...validForBest].sort((a, b) => b.netPnl - a.netPnl)[0] : null;
      const best = bestItem ? `${bestItem.name} (${formatINR(bestItem.netPnl)})` : 'None';

      const validForCommon = list.filter(g => g.name !== 'Not Recorded' && g.count > 0);
      const commonItem = validForCommon.length > 0 ? [...validForCommon].sort((a, b) => b.count - a.count)[0] : null;
      const mostCommon = commonItem ? `${commonItem.name} (${commonItem.count} trades)` : 'None';

      return {
        data: list,
        insights: { best, mostCommon, extra: '' },
        hasNoData
      };
    } else if (marketBehaviorSubFilter === 'HOURLY_TREND') {
      const groups: Record<string, any[]> = {
        'Uptrend': [],
        'Downtrend': [],
        'Consolidation': [],
        'Not Recorded': []
      };

      trades.forEach(t => {
        const trend = t.hourly_trend ? String(t.hourly_trend).toUpperCase() : '';
        if (trend === 'UP') {
          groups['Uptrend'].push(t);
        } else if (trend === 'DOWN') {
          groups['Downtrend'].push(t);
        } else if (trend === 'CONSOLIDATION') {
          groups['Consolidation'].push(t);
        } else {
          groups['Not Recorded'].push(t);
        }
      });

      const categories = ['Uptrend', 'Downtrend', 'Consolidation', 'Not Recorded'];
      list = categories.map(name => {
        const gTrades = groups[name] || [];
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });

      const nonNotRecordedCount = list.filter(g => g.name !== 'Not Recorded' && g.count > 0).length;
      hasNoData = nonNotRecordedCount === 0;

      const validForBest = list.filter(g => g.name !== 'Not Recorded' && g.netPnl > 0);
      const bestItem = validForBest.length > 0 ? [...validForBest].sort((a, b) => b.netPnl - a.netPnl)[0] : null;
      const best = bestItem ? `${bestItem.name} (${formatINR(bestItem.netPnl)})` : 'None';

      const upItem = list.find(g => g.name === 'Uptrend');
      const downItem = list.find(g => g.name === 'Downtrend');
      const consItem = list.find(g => g.name === 'Consolidation');

      const upPct = upItem && upItem.count > 0 ? `${upItem.winPct.toFixed(1)}%` : '—';
      const downPct = downItem && downItem.count > 0 ? `${downItem.winPct.toFixed(1)}%` : '—';
      const consPct = consItem && consItem.count > 0 ? `${consItem.winPct.toFixed(1)}%` : '—';

      const winRatesStr = `UP: ${upPct} | DOWN: ${downPct} | CONSOLIDATION: ${consPct}`;

      return {
        data: list,
        insights: { best, mostCommon: '', extra: winRatesStr },
        hasNoData
      };
    } else if (marketBehaviorSubFilter === 'PHASE_PO3') {
      const groups: Record<string, any[]> = {};
      trades.forEach(t => {
        const val = t.phase && String(t.phase).trim() !== '' 
          ? String(t.phase).trim() 
          : 'Not Recorded';
        if (!groups[val]) groups[val] = [];
        groups[val].push(t);
      });

      list = Object.entries(groups).map(([name, gTrades]) => {
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });

      list.sort((a, b) => b.netPnl - a.netPnl);

      const nonNotRecordedCount = list.filter(g => g.name !== 'Not Recorded' && g.count > 0).length;
      hasNoData = nonNotRecordedCount === 0;

      const validForBest = list.filter(g => g.name !== 'Not Recorded' && g.netPnl > 0);
      const bestItem = validForBest.length > 0 ? [...validForBest].sort((a, b) => b.netPnl - a.netPnl)[0] : null;
      const best = bestItem ? `${bestItem.name} (${formatINR(bestItem.netPnl)})` : 'None';

      return {
        data: list,
        insights: { best, mostCommon: '', extra: '' },
        hasNoData
      };
    } else if (marketBehaviorSubFilter === 'TREND_POSITION') {
      const groups: Record<string, any[]> = {};
      trades.forEach(t => {
        const val = t.trend_position && String(t.trend_position).trim() !== '' 
          ? String(t.trend_position).trim() 
          : 'Not Recorded';
        if (!groups[val]) groups[val] = [];
        groups[val].push(t);
      });

      list = Object.entries(groups).map(([name, gTrades]) => {
        const count = gTrades.length;
        const netPnl = gTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) > 0 ? (t.pnl || 0) : 0), 0);
        const totalLoss = gTrades.reduce((sum, t) => sum + ((t.pnl || 0) < 0 ? (t.pnl || 0) : 0), 0);
        const wins = gTrades.filter(t => t.status === 'Win').length;
        const winPct = count > 0 ? (wins / count) * 100 : 0;
        return { name, count, netPnl, totalProfit, totalLoss, wins, winPct };
      });

      list.sort((a, b) => b.count - a.count);

      const nonNotRecordedCount = list.filter(g => g.name !== 'Not Recorded' && g.count > 0).length;
      hasNoData = nonNotRecordedCount === 0;

      const validForBest = list.filter(g => g.name !== 'Not Recorded' && g.netPnl > 0);
      const bestItem = validForBest.length > 0 ? [...validForBest].sort((a, b) => b.netPnl - a.netPnl)[0] : null;
      const best = bestItem ? `${bestItem.name} (${formatINR(bestItem.netPnl)})` : 'None';

      const validForCommon = list.filter(g => g.name !== 'Not Recorded' && g.count > 0);
      const commonItem = validForCommon.length > 0 ? [...validForCommon].sort((a, b) => b.count - a.count)[0] : null;
      const mostCommon = commonItem ? `${commonItem.name} (${commonItem.count} trades)` : 'None';

      return {
        data: list,
        insights: { best, mostCommon, extra: '' },
        hasNoData
      };
    }

    return { data: [], insights: { best: '—', mostCommon: '—', extra: '' }, hasNoData: true };
  }, [trades, marketBehaviorSubFilter]);

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
        <main className="flex-1 overflow-y-auto px-0">
          <div className="max-w-7xl mx-auto">
            {/* PAGE HEADER & FILTERS */}
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
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }} className="font-display tracking-tight">
                Reports
              </h1>

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

            <div className="mt-3" />

            {/* TAB SELECTOR BAR */}
            <div className="flex overflow-x-auto gap-2 px-1 pt-1 pb-1 rounded-lg mb-3 font-mono no-scrollbar" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
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
                    className={`px-4 py-2 text-xs font-bold ${isActive ? 'rounded' : 'rounded-xl'} transition-all cursor-pointer whitespace-nowrap`}
                    style={{
                      backgroundColor: isActive ? 'var(--card)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-sub)',
                      border: isActive ? '0.5px solid var(--border)' : '0.5px solid transparent',
                      borderRadius: isActive ? '6px' : undefined
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
                  <div className="px-5 py-4 rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">
                      BEST MONTH
                    </div>
                    <div className="text-2xl font-bold mt-1 font-mono text-green-500">
                      {formatINR(overviewStats.bestMonth.sum)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 font-sans">
                      {overviewStats.bestMonth.label === '—' ? 'None in selected period' : overviewStats.bestMonth.label}
                    </div>
                  </div>

                  {/* Card 2: WORST MONTH */}
                  <div className="px-5 py-4 rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">
                      WORST MONTH
                    </div>
                    <div className={`text-2xl font-bold mt-1 font-mono ${overviewStats.worstMonth.sum < 0 ? 'text-red-500' : 'text-zinc-100'}`}>
                      {formatINR(overviewStats.worstMonth.sum)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 font-sans">
                      {overviewStats.worstMonth.label === '—' ? 'None in selected period' : overviewStats.worstMonth.label}
                    </div>
                  </div>

                  {/* Card 3: MONTHLY AVERAGE */}
                  <div className="px-5 py-4 rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">
                      AVG PER MONTH
                    </div>
                    <div className={`text-2xl font-bold mt-1 font-mono ${overviewStats.monthlyAvg > 0 ? 'text-green-500' : overviewStats.monthlyAvg < 0 ? 'text-red-500' : 'text-zinc-100'}`}>
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
            ) : activeTab === 'DETAILED' ? (
              <div className="space-y-6 animate-in fade-in duration-350">
                {/* SUB-FILTER PILLS ROW */}
                <div className="flex overflow-x-auto gap-1.5 p-1 rounded-xl font-mono no-scrollbar" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', maxWidth: 'max-content' }}>
                  {[
                    { id: 'DAYS', label: 'DAYS' },
                    { id: 'MONTHS', label: 'MONTHS' },
                    { id: 'TIME', label: 'TIME' },
                    { id: 'DURATION', label: 'TRADE DURATION' },
                    { id: 'SYMBOL', label: 'SYMBOL' },
                    { id: 'SETUPS', label: 'SETUPS' },
                    { id: 'MISTAKES', label: 'MISTAKES' }
                  ].map((sf) => {
                    const isActive = detailedSubFilter === sf.id;
                    return (
                      <button
                        key={sf.id}
                        type="button"
                        onClick={() => setDetailedSubFilter(sf.id as any)}
                        className="px-3.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap"
                        style={{
                          backgroundColor: isActive ? 'var(--card)' : 'transparent',
                          color: isActive ? 'var(--accent)' : 'var(--text-sub)',
                          border: isActive ? '0.5px solid var(--border)' : '0.5px solid transparent'
                        }}
                      >
                        {sf.label}
                      </button>
                    );
                  })}
                </div>

                {/* SECOND LEVEL FILTERS */}
                {detailedSubFilter === 'TIME' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-mono">Interval:</span>
                    <div className="flex gap-1.5 p-0.5 rounded-lg font-mono" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
                      {['1 Hour', '30 Minutes', '15 Minutes'].map((opt) => {
                        const isActive = detailedTimeInterval === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setDetailedTimeInterval(opt as any)}
                            className="px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer"
                            style={{
                              backgroundColor: isActive ? 'var(--card)' : 'transparent',
                              color: isActive ? 'var(--accent)' : 'var(--text-sub)'
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {detailedSubFilter === 'MISTAKES' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-mono">Group By:</span>
                    <div className="flex gap-1.5 p-0.5 rounded-lg font-mono" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
                      {['BY TYPE', 'BY SPECIFIC MISTAKE'].map((opt) => {
                        const isActive = detailedMistakeClass === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setDetailedMistakeClass(opt as any)}
                            className="px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer"
                            style={{
                              backgroundColor: isActive ? 'var(--card)' : 'transparent',
                              color: isActive ? 'var(--accent)' : 'var(--text-sub)'
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CARDS AND TABLES CONTENT OR EMPTY STATE */}
                {!(detailedData.length > 0 && detailedData.some(item => item.count > 0)) ? (
                  <div className="p-12 rounded-2xl text-center shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <p className="text-sm text-zinc-400 font-mono">No trades found for this category in the selected date range.</p>
                  </div>
                ) : (
                  <>
                    {/* CHARTS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left card: Trade Distribution */}
                      <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                        <h3 className="text-xs font-bold font-mono tracking-wider mb-4 text-zinc-350">
                          {detailedSubFilter === 'DAYS' && 'TRADE DISTRIBUTION BY DAY OF WEEK'}
                          {detailedSubFilter === 'MONTHS' && 'TRADE DISTRIBUTION BY MONTH'}
                          {detailedSubFilter === 'TIME' && 'TRADE DISTRIBUTION BY TIME'}
                          {detailedSubFilter === 'DURATION' && 'TRADE DISTRIBUTION BY DURATION'}
                          {detailedSubFilter === 'SYMBOL' && 'TRADE DISTRIBUTION BY SYMBOL'}
                          {detailedSubFilter === 'SETUPS' && 'TRADE DISTRIBUTION BY SETUP'}
                          {detailedSubFilter === 'MISTAKES' && 'TRADE DISTRIBUTION BY MISTAKE'}
                        </h3>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={detailedData}
                              layout="vertical"
                              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                              <XAxis type="number" stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" allowDecimals={false} />
                              <YAxis
                                dataKey="name"
                                type="category"
                                stroke="var(--text-muted)"
                                fontSize={11}
                                fontFamily="monospace"
                                width={detailedSubFilter === 'MISTAKES' || detailedSubFilter === 'SETUPS' || detailedSubFilter === 'SYMBOL' ? 120 : 80}
                              />
                              <RechartsTooltip
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}
                              />
                              <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Right card: Performance */}
                      <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                        <h3 className="text-xs font-bold font-mono tracking-wider mb-4 text-zinc-350">
                          {detailedSubFilter === 'DAYS' && 'PERFORMANCE BY DAY OF WEEK'}
                          {detailedSubFilter === 'MONTHS' && 'PERFORMANCE BY MONTH'}
                          {detailedSubFilter === 'TIME' && 'PERFORMANCE BY TIME'}
                          {detailedSubFilter === 'DURATION' && 'PERFORMANCE BY DURATION'}
                          {detailedSubFilter === 'SYMBOL' && 'PERFORMANCE BY SYMBOL'}
                          {detailedSubFilter === 'SETUPS' && 'PERFORMANCE BY SETUP'}
                          {detailedSubFilter === 'MISTAKES' && 'PERFORMANCE BY MISTAKE'}
                        </h3>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={detailedData}
                              layout="vertical"
                              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                              <XAxis type="number" stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" />
                              <YAxis
                                dataKey="name"
                                type="category"
                                stroke="var(--text-muted)"
                                fontSize={11}
                                fontFamily="monospace"
                                width={detailedSubFilter === 'MISTAKES' || detailedSubFilter === 'SETUPS' || detailedSubFilter === 'SYMBOL' ? 120 : 80}
                              />
                              <RechartsTooltip
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                formatter={(value: any) => [formatINR(value), 'Net P&L']}
                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}
                              />
                              <Bar dataKey="netPnl" radius={[0, 4, 4, 0]}>
                                {detailedData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.netPnl >= 0 ? '#22c55e' : '#ef4444'} />
                                ))}
                              </Bar>
                              <ReferenceLine x={0} stroke="var(--border)" strokeDasharray="3 3" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {detailedSubFilter === 'TIME' && (
                      <div className="text-center text-xs text-zinc-500 font-mono mt-2">
                        All times shown in IST
                      </div>
                    )}

                    {/* SUMMARY TABLE */}
                    <div className="rounded-2xl overflow-hidden shadow-sm border border-[var(--border)]" style={{ backgroundColor: 'var(--card)' }}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }} className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-800/10 dark:bg-zinc-100/5">
                              <th className="py-3 px-4 font-bold">Category</th>
                              <th className="py-3 px-4 font-bold text-right">Net Profits</th>
                              <th className="py-3 px-4 font-bold text-center">Win %</th>
                              <th className="py-3 px-4 font-bold text-right bg-green-500/5">Total Profits</th>
                              <th className="py-3 px-4 font-bold text-right bg-red-500/5">Total Loss</th>
                              <th className="py-3 px-4 font-bold text-center">Trades</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {detailedData.map((row, index) => {
                              return (
                                <tr
                                  key={index}
                                  className={`${
                                    index % 2 === 1 ? 'bg-zinc-800/5 dark:bg-zinc-100/5' : 'bg-transparent'
                                  } hover:bg-zinc-800/10 dark:hover:bg-zinc-100/10 transition-colors text-xs font-sans`}
                                >
                                  {/* Category */}
                                  <td className="py-3.5 px-4 font-semibold text-zinc-200">
                                    {row.name}
                                  </td>

                                  {/* Net Profits */}
                                  <td className={`py-3.5 px-4 text-right font-mono font-bold ${row.netPnl > 0 ? 'text-green-500' : row.netPnl < 0 ? 'text-red-500' : 'text-zinc-255'}`}>
                                    {formatINR(row.netPnl)}
                                  </td>

                                  {/* Win % with custom split progress bar */}
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center justify-center gap-2 max-w-[150px] mx-auto">
                                      {row.count > 0 ? (
                                        <>
                                          <div className="w-16 h-2 rounded bg-zinc-700/30 flex overflow-hidden">
                                            <div className="bg-green-500 h-full" style={{ width: `${row.winPct}%` }} />
                                            <div className="bg-red-500 h-full" style={{ width: `${100 - row.winPct}%` }} />
                                          </div>
                                          <span className="font-mono font-bold text-zinc-350 text-xs">{row.winPct.toFixed(1)}%</span>
                                        </>
                                      ) : (
                                        <span className="font-mono text-zinc-500">—</span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Total Profits */}
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-green-500 bg-green-500/5">
                                    {formatINR(row.totalProfit)}
                                  </td>

                                  {/* Total Loss */}
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-red-500 bg-red-500/5">
                                    {formatINR(row.totalLoss)}
                                  </td>

                                  {/* Trades */}
                                  <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-300">
                                    {row.count}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : activeTab === 'RISK' ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* SUB-FILTER PILLS ROW */}
                <div className="flex overflow-x-auto gap-1.5 p-1 rounded-xl font-mono no-scrollbar" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', maxWidth: 'max-content' }}>
                  {[
                    { id: 'R-MULTIPLE', label: 'R-MULTIPLE' },
                    { id: 'POSITION_SIZE', label: 'POSITION SIZE' }
                  ].map((sf) => {
                    const isActive = riskSubFilter === sf.id;
                    return (
                      <button
                        key={sf.id}
                        type="button"
                        onClick={() => setRiskSubFilter(sf.id as any)}
                        className="px-3.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap"
                        style={{
                          backgroundColor: isActive ? 'var(--card)' : 'transparent',
                          color: isActive ? 'var(--accent)' : 'var(--text-sub)',
                          border: isActive ? '0.5px solid var(--border)' : '0.5px solid transparent'
                        }}
                      >
                        {sf.label}
                      </button>
                    );
                  })}
                </div>

                {/* CARDS AND TABLES CONTENT OR EMPTY STATE */}
                {!(riskData.length > 0) ? (
                  <div className="p-12 rounded-2xl text-center shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <p className="text-sm text-zinc-400 font-mono">No trades found with required values for this sub-filter in the selected date range.</p>
                  </div>
                ) : (
                  <>
                    {/* CHARTS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left chart: Trade Distribution */}
                      <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                        <h3 className="text-xs font-bold font-mono tracking-wider mb-4 text-zinc-350 uppercase">
                          {riskSubFilter === 'R-MULTIPLE' ? 'TRADE DISTRIBUTION BY R-MULTIPLE' : 'TRADE DISTRIBUTION BY POSITION SIZE'}
                        </h3>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={riskData}
                              layout="vertical"
                              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                              <XAxis type="number" stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" allowDecimals={false} />
                              <YAxis
                                dataKey="name"
                                type="category"
                                stroke="var(--text-muted)"
                                fontSize={11}
                                fontFamily="monospace"
                                width={110}
                              />
                              <RechartsTooltip
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}
                              />
                              <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Right chart: Performance */}
                      <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                        <h3 className="text-xs font-bold font-mono tracking-wider mb-4 text-zinc-350 uppercase">
                          {riskSubFilter === 'R-MULTIPLE' ? 'PERFORMANCE BY R-MULTIPLE' : 'PERFORMANCE BY POSITION SIZE'}
                        </h3>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={riskData}
                              layout="vertical"
                              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                              <XAxis type="number" stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" />
                              <YAxis
                                dataKey="name"
                                type="category"
                                stroke="var(--text-muted)"
                                fontSize={11}
                                fontFamily="monospace"
                                width={110}
                              />
                              <RechartsTooltip
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                formatter={(value: any) => [formatINR(value), 'Net P&L']}
                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}
                              />
                              <Bar dataKey="netPnl" radius={[0, 4, 4, 0]}>
                                {riskData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.netPnl >= 0 ? '#22c55e' : '#ef4444'} />
                                ))}
                              </Bar>
                              <ReferenceLine x={0} stroke="var(--border)" strokeDasharray="3 3" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* SUMMARY TABLE */}
                    <div className="rounded-2xl overflow-hidden shadow-sm border border-[var(--border)]" style={{ backgroundColor: 'var(--card)' }}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }} className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-800/10 dark:bg-zinc-100/5">
                              <th className="py-3 px-4 font-bold">
                                {riskSubFilter === 'R-MULTIPLE' ? 'R-Multiple' : 'Position Size'}
                              </th>
                              <th className="py-3 px-4 font-bold text-right font-mono">Net Profits</th>
                              <th className="py-3 px-4 font-bold text-center font-mono">Win %</th>
                              <th className="py-3 px-4 font-bold text-right font-mono bg-green-500/5">Total Profits</th>
                              <th className="py-3 px-4 font-bold text-right font-mono bg-red-500/5">Total Loss</th>
                              <th className="py-3 px-4 font-bold text-center font-mono">Trades</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {riskData.map((row, index) => {
                              return (
                                <tr
                                  key={index}
                                  className={`${
                                    index % 2 === 1 ? 'bg-zinc-800/5 dark:bg-zinc-100/5' : 'bg-transparent'
                                  } hover:bg-zinc-800/10 dark:hover:bg-zinc-100/10 transition-colors text-xs font-sans`}
                                >
                                  {/* Category */}
                                  <td className="py-3.5 px-4 font-semibold text-zinc-200">
                                    {row.name}
                                  </td>

                                  {/* Net Profits */}
                                  <td className={`py-3.5 px-4 text-right font-mono font-bold ${row.netPnl > 0 ? 'text-green-500' : row.netPnl < 0 ? 'text-red-500' : 'text-zinc-200'}`}>
                                    {formatINR(row.netPnl)}
                                  </td>

                                  {/* Win % with custom split progress bar */}
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center justify-center gap-2 max-w-[150px] mx-auto">
                                      {row.count > 0 ? (
                                        <>
                                          <div className="w-16 h-2 rounded bg-zinc-700/30 flex overflow-hidden">
                                            <div className="bg-green-500 h-full" style={{ width: `${row.winPct}%` }} />
                                            <div className="bg-red-500 h-full" style={{ width: `${100 - row.winPct}%` }} />
                                          </div>
                                          <span className="font-mono font-bold text-zinc-350 text-xs">{row.winPct.toFixed(1)}%</span>
                                        </>
                                      ) : (
                                        <span className="font-mono text-zinc-500">—</span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Total Profits */}
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-green-500 bg-green-500/5">
                                    {formatINR(row.totalProfit)}
                                  </td>

                                  {/* Total Loss */}
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-red-500 bg-red-500/5">
                                    {formatINR(row.totalLoss)}
                                  </td>

                                  {/* Trades */}
                                  <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-300">
                                    {row.count}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : activeTab === 'WINS_LOSSES' ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* HEAD TO HEAD STAT CARDS */}
                <div className="rounded-2xl p-6 shadow-sm border border-[var(--border)]" style={{ backgroundColor: 'var(--card)' }}>
                  <div className="grid grid-cols-3 pb-4 mb-4 font-mono font-bold text-xs tracking-wider uppercase border-b border-[var(--border)]">
                    <div className="text-green-500 font-extrabold text-sm text-left">WINS</div>
                    <div className="text-center text-zinc-400">HEAD TO HEAD</div>
                    <div className="text-right text-red-500 font-extrabold text-sm">LOSSES</div>
                  </div>
                  
                  <div className="divide-y divide-zinc-800/40 dark:divide-zinc-100/10 text-sm">
                    {/* Row 1 - Total Count */}
                    <div className="grid grid-cols-3 py-3 items-center">
                      <div className="font-mono font-bold text-green-500 text-lg">{winsLossesStats.totalCountWins}</div>
                      <div className="text-center text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-semibold">Total Count</div>
                      <div className="font-mono font-bold text-red-500 text-right text-lg">{winsLossesStats.totalCountLosses}</div>
                    </div>

                    {/* Row 2 - Total P&L */}
                    <div className="grid grid-cols-3 py-3 items-center">
                      <div className="font-mono font-bold text-green-500 text-base">{formatINR(winsLossesStats.totalPnlWins)}</div>
                      <div className="text-center text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-semibold">Total P&L</div>
                      <div className="font-mono font-bold text-red-500 text-right text-base">{formatINR(winsLossesStats.totalPnlLosses)}</div>
                    </div>

                    {/* Row 3 - Average Per Trade */}
                    <div className="grid grid-cols-3 py-3 items-center">
                      <div className="font-mono font-bold text-green-500">{formatINR(winsLossesStats.avgPnlWins)}</div>
                      <div className="text-center text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-semibold">Average Per Trade</div>
                      <div className="font-mono font-bold text-red-500 text-right">{formatINR(winsLossesStats.avgPnlLosses)}</div>
                    </div>

                    {/* Row 4 - Average R-Multiple */}
                    <div className="grid grid-cols-3 py-3 items-center">
                      <div className="font-mono font-bold text-green-400">
                        {winsLossesStats.avgRMultipleWins !== null ? `+${winsLossesStats.avgRMultipleWins.toFixed(2)}R` : '—'}
                      </div>
                      <div className="text-center text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-semibold">Average R-Multiple</div>
                      <div className="font-mono font-bold text-red-400 text-right">
                        {winsLossesStats.avgRMultipleLosses !== null ? `${winsLossesStats.avgRMultipleLosses.toFixed(2)}R` : '—'}
                      </div>
                    </div>

                    {/* Row 5 - Average Hold Time */}
                    <div className="grid grid-cols-3 py-3 items-center">
                      <div className="font-mono font-bold text-green-400">{formatMins(winsLossesStats.avgHoldWins)}</div>
                      <div className="text-center text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-semibold">Average Hold Time</div>
                      <div className="font-mono font-bold text-red-400 text-right">{formatMins(winsLossesStats.avgHoldLosses)}</div>
                    </div>

                    {/* Row 6 - Largest */}
                    <div className="grid grid-cols-3 py-3 items-center">
                      <div className="font-mono font-bold text-green-500">{formatINR(winsLossesStats.largestWin)}</div>
                      <div className="text-center text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-semibold">Largest</div>
                      <div className="font-mono font-bold text-red-500 text-right">{formatINR(winsLossesStats.largestLoss)}</div>
                    </div>

                    {/* Row 7 - Most Common Setup */}
                    <div className="grid grid-cols-3 py-3 items-center">
                      <div className="font-sans font-semibold text-zinc-200 truncate pr-2" title={winsLossesStats.topWinSetup}>{winsLossesStats.topWinSetup}</div>
                      <div className="text-center text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-semibold">Most Common Setup</div>
                      <div className="font-sans font-semibold text-zinc-200 text-right truncate pl-2" title={winsLossesStats.topLossSetup}>{winsLossesStats.topLossSetup}</div>
                    </div>

                    {/* Row 8 - Most Common Mistake */}
                    <div className="grid grid-cols-3 py-3 items-center">
                      <div className="font-sans font-semibold text-zinc-200 truncate pr-2" title={winsLossesStats.topWinMistake}>{winsLossesStats.topWinMistake}</div>
                      <div className="text-center text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-semibold">Most Common Mistake</div>
                      <div className="font-sans font-semibold text-zinc-200 text-right truncate pl-2" title={winsLossesStats.topLossMistake}>{winsLossesStats.topLossMistake}</div>
                    </div>
                  </div>
                </div>

                {/* VISUAL CHARTS ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Setup Comparison Chart */}
                  <div className="rounded-2xl p-5 shadow-sm border border-[var(--border)]" style={{ backgroundColor: 'var(--card)' }}>
                    <h3 className="text-xs font-bold font-mono tracking-wider mb-4 text-zinc-350 uppercase">
                      WINS VS LOSSES BY SETUP
                    </h3>
                    <div className="h-[300px] w-full">
                      {winsLossesBySetup.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-xs text-zinc-500 font-mono">No data available</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={winsLossesBySetup}
                            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" />
                            <YAxis stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" allowDecimals={false} />
                            <RechartsTooltip
                              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }} />
                            <Bar dataKey="wins" name="Wins" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Day of Week Comparison Chart */}
                  <div className="rounded-2xl p-5 shadow-sm border border-[var(--border)]" style={{ backgroundColor: 'var(--card)' }}>
                    <h3 className="text-xs font-bold font-mono tracking-wider mb-4 text-zinc-350 uppercase">
                      WINS VS LOSSES BY DAY OF WEEK
                    </h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={winsLossesByDay}
                          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                          <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" />
                          <YAxis stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" allowDecimals={false} />
                          <RechartsTooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }} />
                          <Bar dataKey="wins" name="Wins" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Time of Day Comparison Chart */}
                <div className="rounded-2xl p-5 shadow-sm border border-[var(--border)]" style={{ backgroundColor: 'var(--card)' }}>
                  <h3 className="text-xs font-bold font-mono tracking-wider mb-4 text-zinc-350 uppercase">
                    WINS VS LOSSES BY TIME OF DAY
                  </h3>
                  <div className="h-[300px] w-full">
                    {winsLossesByTime.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-xs text-zinc-500 font-mono">No time-of-day data available</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={winsLossesByTime}
                          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                          <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" />
                          <YAxis stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" allowDecimals={false} />
                          <RechartsTooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }} />
                          <Bar dataKey="wins" name="Wins" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="text-center text-xs text-zinc-500 font-mono mt-2">
                    All times shown in IST
                  </div>
                </div>

                {/* SETUP BREAKDOWN TABLE */}
                <div className="rounded-2xl overflow-hidden shadow-sm border border-[var(--border)]" style={{ backgroundColor: 'var(--card)' }}>
                  <div className="p-4 border-b border-[var(--border)] bg-zinc-800/10 dark:bg-zinc-100/5">
                    <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-zinc-350">
                      SETUP BREAKDOWN — WINS VS LOSSES
                    </h3>
                  </div>
                  <div className="overflow-x-auto border-0">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }} className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-800/10 dark:bg-zinc-100/5">
                          <th className="py-3 px-4 font-bold">Setup</th>
                          <th className="py-3 px-4 font-bold text-center font-mono">Trades</th>
                          <th className="py-3 px-4 font-bold text-center font-mono">Wins</th>
                          <th className="py-3 px-4 font-bold text-center font-mono">Losses</th>
                          <th className="py-3 px-4 font-bold text-center font-mono">Win Rate</th>
                          <th className="py-3 px-4 font-bold text-right font-mono bg-green-500/5">Avg Win</th>
                          <th className="py-3 px-4 font-bold text-right font-mono bg-red-500/5">Avg Loss</th>
                          <th className="py-3 px-4 font-bold text-right font-mono">Net P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {setupBreakdown.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-xs text-zinc-500 font-mono">
                              No setup data available for the selected range.
                            </td>
                          </tr>
                        ) : (
                          setupBreakdown.map((row, index) => {
                            return (
                              <tr
                                key={index}
                                className={`${
                                  index % 2 === 1 ? 'bg-zinc-800/5 dark:bg-zinc-100/5' : 'bg-transparent'
                                } hover:bg-zinc-800/10 dark:hover:bg-zinc-100/10 transition-colors text-xs font-sans`}
                              >
                                <td className="py-3.5 px-4 font-semibold text-zinc-200">
                                  {row.name}
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-300">
                                  {row.trades}
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono font-bold text-green-500 bg-green-500/5">
                                  {row.wins}
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono font-bold text-red-500 bg-red-500/5">
                                  {row.losses}
                                </td>
                                <td className={`py-3.5 px-4 text-center font-mono font-bold ${row.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                                  {row.winRate.toFixed(1)}%
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-green-500 bg-green-500/10">
                                  {formatINR(row.avgWin)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-red-500 bg-red-500/10">
                                  {formatINR(row.avgLoss)}
                                </td>
                                <td className={`py-3.5 px-4 text-right font-mono font-bold ${row.netPnl > 0 ? 'text-green-500' : row.netPnl < 0 ? 'text-red-500' : 'text-zinc-200'}`}>
                                  {formatINR(row.netPnl)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === 'MARKET_BEHAVIOR' ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* DATA QUALITY NOTE BANNER */}
                {showMarketBehaviorDataQualityBanner && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-cyan-500/20 text-xs shadow-sm bg-cyan-950/10 text-cyan-200">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p className="font-mono leading-relaxed">
                      These insights are based on the context you recorded when logging trades. 
                      Trades without this information are grouped as <span className="font-semibold text-cyan-300">"Not Recorded"</span>. 
                      Log more context fields in your trades to improve these insights.
                    </p>
                  </div>
                )}

                {/* SUB-FILTER PILLS ROW */}
                <div className="flex overflow-x-auto gap-1.5 p-1 rounded-xl font-mono no-scrollbar" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', maxWidth: 'max-content' }}>
                  {[
                    { id: 'OPENING_CONDITION', label: 'OPENING CONDITION' },
                    { id: 'HOURLY_TREND', label: 'HOURLY TREND' },
                    { id: 'PHASE_PO3', label: 'PHASE (PO3)' },
                    { id: 'TREND_POSITION', label: 'TREND POSITION' }
                  ].map((sf) => {
                    const isActive = marketBehaviorSubFilter === sf.id;
                    return (
                      <button
                        key={sf.id}
                        type="button"
                        onClick={() => setMarketBehaviorSubFilter(sf.id as any)}
                        className="px-3.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap"
                        style={{
                          backgroundColor: isActive ? 'var(--card)' : 'transparent',
                          color: isActive ? 'var(--accent)' : 'var(--text-sub)',
                          border: isActive ? '0.5px solid var(--border)' : '0.5px solid transparent'
                        }}
                      >
                        {sf.label}
                      </button>
                    );
                  })}
                </div>

                {/* CARDS AND TABLES CONTENT OR EMPTY STATE */}
                {marketBehaviorDataAndInsights.hasNoData ? (
                  <div className="p-12 rounded-2xl text-center shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <HelpCircle className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                    <p className="text-sm text-zinc-400 font-mono">
                      No {marketBehaviorSubFilter === 'OPENING_CONDITION' ? 'opening condition' : marketBehaviorSubFilter === 'HOURLY_TREND' ? 'hourly trend' : marketBehaviorSubFilter === 'PHASE_PO3' ? 'phase (PO3)' : 'trend position'} data recorded yet. Start adding context when logging trades.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* CHARTS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Trade Distribution horizontal bar chart */}
                      <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                        <h3 className="text-xs font-bold font-mono tracking-wider mb-4 text-zinc-350 uppercase">
                          {marketBehaviorSubFilter === 'OPENING_CONDITION' && 'TRADE DISTRIBUTION BY OPENING CONDITION'}
                          {marketBehaviorSubFilter === 'HOURLY_TREND' && 'TRADE DISTRIBUTION BY HOURLY TREND'}
                          {marketBehaviorSubFilter === 'PHASE_PO3' && 'TRADE DISTRIBUTION BY PHASE (PO3)'}
                          {marketBehaviorSubFilter === 'TREND_POSITION' && 'TRADE DISTRIBUTION BY TREND POSITION'}
                        </h3>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={marketBehaviorDataAndInsights.data}
                              layout="vertical"
                              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                              <XAxis type="number" stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" allowDecimals={false} />
                              <YAxis
                                dataKey="name"
                                type="category"
                                stroke="var(--text-muted)"
                                fontSize={11}
                                fontFamily="monospace"
                                width={110}
                              />
                              <RechartsTooltip
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}
                              />
                              <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Insights (under chart) */}
                        {marketBehaviorSubFilter === 'OPENING_CONDITION' && (
                          <div className="mt-4 pt-4 border-t border-[var(--border)] text-[12px] text-zinc-400 font-mono space-y-1">
                            <div>Your best opening condition: <span className="font-semibold text-zinc-200">{marketBehaviorDataAndInsights.insights.best}</span></div>
                            <div>Your most traded: <span className="font-semibold text-zinc-200">{marketBehaviorDataAndInsights.insights.mostCommon}</span></div>
                          </div>
                        )}
                        {marketBehaviorSubFilter === 'HOURLY_TREND' && (
                          <div className="mt-4 pt-4 border-t border-[var(--border)] text-[12px] text-zinc-400 font-mono space-y-1">
                            <div>Your most profitable trend: <span className="font-semibold text-zinc-200">{marketBehaviorDataAndInsights.insights.best}</span></div>
                            <div>Your win rate by trend: <span className="font-semibold text-zinc-200">{marketBehaviorDataAndInsights.insights.extra}</span></div>
                          </div>
                        )}
                        {marketBehaviorSubFilter === 'PHASE_PO3' && (
                          <div className="mt-4 pt-4 border-t border-[var(--border)] text-[12px] font-mono space-y-1.5">
                            <div className="text-zinc-500 italic">
                              Phase refers to the Power of Three (PO3) model: Accumulation → Manipulation → Distribution
                            </div>
                            <div className="text-zinc-400">
                              Your most profitable phase: <span className="font-semibold text-zinc-200">{marketBehaviorDataAndInsights.insights.best}</span>
                            </div>
                          </div>
                        )}
                        {marketBehaviorSubFilter === 'TREND_POSITION' && (
                          <div className="mt-4 pt-4 border-t border-[var(--border)] text-[12px] text-zinc-400 font-mono space-y-1">
                            <div>Your best trend position: <span className="font-semibold text-zinc-200">{marketBehaviorDataAndInsights.insights.best}</span></div>
                            <div>Your most common entry: <span className="font-semibold text-zinc-200">{marketBehaviorDataAndInsights.insights.mostCommon}</span></div>
                          </div>
                        )}
                      </div>

                      {/* Right: Performance horizontal bar chart */}
                      <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                        <h3 className="text-xs font-bold font-mono tracking-wider mb-4 text-zinc-350 uppercase">
                          {marketBehaviorSubFilter === 'OPENING_CONDITION' && 'PERFORMANCE BY OPENING CONDITION'}
                          {marketBehaviorSubFilter === 'HOURLY_TREND' && 'PERFORMANCE BY HOURLY TREND'}
                          {marketBehaviorSubFilter === 'PHASE_PO3' && 'PERFORMANCE BY PHASE (PO3)'}
                          {marketBehaviorSubFilter === 'TREND_POSITION' && 'PERFORMANCE BY TREND POSITION'}
                        </h3>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={marketBehaviorDataAndInsights.data}
                              layout="vertical"
                              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                              <XAxis type="number" stroke="var(--text-muted)" fontSize={11} fontFamily="monospace" />
                              <YAxis
                                dataKey="name"
                                type="category"
                                stroke="var(--text-muted)"
                                fontSize={11}
                                fontFamily="monospace"
                                width={110}
                              />
                              <RechartsTooltip
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                formatter={(value: any) => [formatINR(value), 'Net P&L']}
                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}
                              />
                              <Bar dataKey="netPnl" radius={[0, 4, 4, 0]}>
                                {marketBehaviorDataAndInsights.data.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.netPnl >= 0 ? '#22c55e' : '#ef4444'} />
                                ))}
                              </Bar>
                              <ReferenceLine x={0} stroke="var(--border)" strokeDasharray="3 3" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* SUMMARY TABLE */}
                    <div className="rounded-2xl overflow-hidden shadow-sm border border-[var(--border)]" style={{ backgroundColor: 'var(--card)' }}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }} className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-800/10 dark:bg-zinc-100/5">
                              <th className="py-3 px-4 font-bold">Category</th>
                              <th className="py-3 px-4 font-bold text-right font-mono">Net Profits</th>
                              <th className="py-3 px-4 font-bold text-center font-mono">Win %</th>
                              <th className="py-3 px-4 font-bold text-right font-mono bg-green-500/5">Total Profits</th>
                              <th className="py-3 px-4 font-bold text-right font-mono bg-red-500/5">Total Loss</th>
                              <th className="py-3 px-4 font-bold text-center font-mono">Trades</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {marketBehaviorDataAndInsights.data.map((row, index) => {
                              return (
                                <tr
                                  key={index}
                                  className={`${
                                    index % 2 === 1 ? 'bg-zinc-800/5 dark:bg-zinc-100/5' : 'bg-transparent'
                                  } hover:bg-zinc-800/10 dark:hover:bg-zinc-100/10 transition-colors text-xs font-sans`}
                                >
                                  {/* Category */}
                                  <td className="py-3.5 px-4 font-semibold text-zinc-200">
                                    {row.name}
                                  </td>

                                  {/* Net Profits */}
                                  <td className={`py-3.5 px-4 text-right font-mono font-bold ${row.netPnl > 0 ? 'text-green-500' : row.netPnl < 0 ? 'text-red-500' : 'text-zinc-200'}`}>
                                    {formatINR(row.netPnl)}
                                  </td>

                                  {/* Win % with custom split progress bar */}
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center justify-center gap-2 max-w-[150px] mx-auto">
                                      {row.count > 0 ? (
                                        <>
                                          <div className="w-16 h-2 rounded bg-zinc-700/30 flex overflow-hidden">
                                            <div className="bg-green-500 h-full" style={{ width: `${row.winPct}%` }} />
                                            <div className="bg-red-500 h-full" style={{ width: `${100 - row.winPct}%` }} />
                                          </div>
                                          <span className="font-mono font-bold text-zinc-350 text-xs">{row.winPct.toFixed(1)}%</span>
                                        </>
                                      ) : (
                                        <span className="font-mono text-zinc-500">—</span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Total Profits */}
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-green-500 bg-green-500/5">
                                    {formatINR(row.totalProfit)}
                                  </td>

                                  {/* Total Loss */}
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-red-500 bg-red-500/5">
                                    {formatINR(row.totalLoss)}
                                  </td>

                                  {/* Trades */}
                                  <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-300">
                                    {row.count}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
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
