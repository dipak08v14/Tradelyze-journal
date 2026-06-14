import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import { DonutChart } from '../components/DonutChart';
import {
  Menu,
  BarChart2,
  TrendingUp,
  Trophy,
  Activity,
  AlertTriangle,
  Flame,
  HelpCircle,
  TrendingDown,
  Calendar,
  Sparkles
} from 'lucide-react';
import { getLibraryConfidenceMessage } from '../lib/clipEmbedder';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

const MONTH_INDEX = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DashboardPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();

  // Selected Month/Year State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const currentMonthIdx = new Date().getMonth();
    return MONTH_NAMES[currentMonthIdx];
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return new Date().getFullYear();
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  
  // Database States
  const [trades, setTrades] = useState<any[]>([]);
  const [psychologyData, setPsychologyData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [rulesData, setRulesData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [visualLibraryCount, setVisualLibraryCount] = useState<number>(0);

  // Fetch global visual library count
  useEffect(() => {
    if (!userId) return;
    const fetchVisualLibraryCount = async () => {
      try {
        const { count, error } = await supabase
          .from('trade_visual_embeddings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (error) throw error;
        setVisualLibraryCount(count || 0);
      } catch (err) {
        console.error('Error fetching visual library count:', err);
      }
    };
    fetchVisualLibraryCount();
  }, [userId]);

  const confidence = useMemo(() => {
    return getLibraryConfidenceMessage(visualLibraryCount);
  }, [visualLibraryCount]);

  // Safety Redirection for Auth
  useEffect(() => {
    if (!authLoading && !userId) {
      navigate('/login');
    }
  }, [userId, authLoading, navigate]);

  // Fetch Year List Once on Mount
  useEffect(() => {
    if (!userId) return;
    const fetchYears = async () => {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('year')
          .eq('user_id', userId);
        if (error) throw error;

        const currentYear = new Date().getFullYear();
        const yearsSet = new Set<number>();
        yearsSet.add(currentYear);
        if (data) {
          data.forEach((item: any) => {
            if (typeof item.year === 'number') {
              yearsSet.add(item.year);
            }
          });
        }
        setAvailableYears(Array.from(yearsSet).sort((a, b) => b - a));
      } catch (err: any) {
        console.error('Error fetching unique years:', err);
      }
    };
    fetchYears();
  }, [userId]);

  // Fetch Dashboard Specific Contexts
  useEffect(() => {
    if (!userId) return;

    const fetchDashboardContext = async () => {
      try {
        setLoading(true);

        // STEP 1 — Fetch filtered trades:
        const { data: tradesData, error: tradesError } = await supabase
          .from('trades')
          .select('*, strategies(name)')
          .eq('user_id', userId)
          .eq('month', selectedMonth)
          .eq('year', selectedYear)
          .order('date', { ascending: true });

        if (tradesError) throw tradesError;

        const activeTrades = tradesData || [];
        setTrades(activeTrades);

        if (activeTrades.length === 0) {
          setPsychologyData([]);
          setRiskData([]);
          setRulesData([]);
          setLoading(false);
          return;
        }

        const tradeIds = activeTrades.map((t: any) => t.id);

        // STEP 3 — Fetch psychology, risk, tech rules in parallel securely
        const [psychRes, riskRes, rulesRes] = await Promise.all([
          supabase
            .from('trade_psychology')
            .select('trade_id, psychological_condition_pct')
            .in('trade_id', tradeIds)
            .eq('user_id', userId),
          supabase
            .from('trade_risk_management')
            .select('trade_id, followed_risk_rules_pct')
            .in('trade_id', tradeIds)
            .eq('user_id', userId),
          supabase
            .from('trade_rule_adherence')
            .select('trade_id, followed')
            .in('trade_id', tradeIds)
            .eq('user_id', userId)
        ]);

        if (psychRes.error) console.error('Psychology fetch error:', psychRes.error);
        if (riskRes.error) console.error('Risk management fetch error:', riskRes.error);
        if (rulesRes.error) console.error('Rule adherence fetch error:', rulesRes.error);

        setPsychologyData(psychRes.data || []);
        setRiskData(riskRes.data || []);
        setRulesData(rulesRes.data || []);

      } catch (err: any) {
        console.error('Sync failure processing trade matrices:', err);
        showError(err.message || 'Error occurred loading performance variables.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardContext();
  }, [userId, selectedMonth, selectedYear, showError]);

  // Indian Rupee Locale Formatting Helper
  const formatINR = (value: number) => {
    const formatted = Math.abs(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${value < 0 ? '-' : ''}₹${formatted}`;
  };

  const formatPositiveINR = (value: number) => {
    return '₹' + Math.abs(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Score colors rule helper (green-400 >= 70, amber-400 >= 50, red-400 < 50)
  const getScoreColorClass = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBgClass = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Memoized Metric Variables
  const stats = useMemo(() => {
    const wins = trades.filter((t) => t.status === 'Win');
    const losses = trades.filter((t) => t.status === 'Loss');
    const breakevens = trades.filter((t) => t.status === 'Breakeven');
    const totalTrades = trades.length;

    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    const rTrades = trades.filter((t) => typeof t.r_multiple === 'number');
    const avgR = rTrades.length > 0
      ? rTrades.reduce((sum, t) => sum + t.r_multiple, 0) / rTrades.length
      : 0;
    const totalRSum = rTrades.reduce((sum, t) => sum + t.r_multiple, 0);

    const totalWinsPnl = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLossesPnl = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));

    const profitFactor = totalLossesPnl > 0
      ? totalWinsPnl / totalLossesPnl
      : (totalWinsPnl > 0 ? 999 : 0);

    const avgWin = wins.length > 0 ? totalWinsPnl / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossesPnl / losses.length : 0;
    const avgWinLossRatio = avgLoss > 0
      ? avgWin / avgLoss
      : (avgWin > 0 ? 999 : 0);

    const largestWinTrade = wins.length > 0
      ? Math.max(...wins.map((t) => typeof t.pnl === 'number' ? t.pnl : 0))
      : 0;
    const largestLossTrade = losses.length > 0
      ? Math.abs(Math.min(...losses.map((t) => typeof t.pnl === 'number' ? t.pnl : 0)))
      : 0;

    // Daily aggregations
    const dailyPnlMap: Record<string, number> = {};
    trades.forEach((t) => {
      const d = t.date;
      if (d) {
        if (!dailyPnlMap[d]) dailyPnlMap[d] = 0;
        dailyPnlMap[d] += (t.pnl || 0);
      }
    });

    const sortedDays = Object.entries(dailyPnlMap).sort((a, b) => a[0].localeCompare(b[0]));
    const winDays = sortedDays.filter(([_, value]) => value > 0).length;
    const lossDays = sortedDays.filter(([_, value]) => value < 0).length;
    const beDays = sortedDays.filter(([_, value]) => value === 0).length;
    const tradingDaysCount = sortedDays.length;

    // DNT Days calculation
    const monthIdx = MONTH_INDEX[selectedMonth as keyof typeof MONTH_INDEX];
    const monthStart = new Date(selectedYear, monthIdx, 1);
    const monthEndRaw = new Date(selectedYear, monthIdx + 1, 0); // last day of month
    const todayObj = new Date();
    const monthEnd = todayObj < monthEndRaw ? (todayObj < monthStart ? monthStart : todayObj) : monthEndRaw;
    const totalCalDays = Math.max(1, Math.round((monthEnd.getTime() - monthStart.getTime()) / 86400000) + 1);
    const dntDays = Math.max(0, totalCalDays - tradingDaysCount);

    const largestProfitDay = sortedDays.length > 0 ? Math.max(...sortedDays.map(([_, v]) => v)) : 0;
    const largestLossDay = sortedDays.length > 0 ? Math.abs(Math.min(...sortedDays.map(([_, v]) => v))) : 0;

    // Streak parameters
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let curWin = 0;
    let curLoss = 0;

    sortedDays.forEach(([_, dayPnl]) => {
      if (dayPnl > 0) {
        curWin++;
        curLoss = 0;
        maxWinStreak = Math.max(maxWinStreak, curWin);
      } else if (dayPnl < 0) {
        curLoss++;
        curWin = 0;
        maxLossStreak = Math.max(maxLossStreak, curLoss);
      } else {
        curWin = 0;
        curLoss = 0;
      }
    });

    // Equity Curve Array
    let cumulative = 0;
    const equityCurveData = [{ day: '0', cumPnl: 0, dailyPnl: 0 }];
    sortedDays.forEach(([date, dayPnl]) => {
      cumulative += dayPnl;
      equityCurveData.push({
        day: new Date(date).getDate().toString(),
        cumPnl: parseFloat(cumulative.toFixed(2)),
        dailyPnl: parseFloat(dayPnl.toFixed(2))
      });
    });

    // Execution Status Frequency
    const execStatusCount: Record<string, number> = {
      'BEST TRADE': 0, 'GOOD TRADE': 0, 'AVERAGE TRADE': 0, 'POOR TRADE': 0, 'BAD TRADE': 0
    };
    trades.forEach((t) => {
      if (t.execution_status && t.execution_status in execStatusCount) {
        execStatusCount[t.execution_status]++;
      }
    });

    // Mistakes Breakdown
    const mistakeCount: Record<string, number> = {
      Technical: 0, Psychological: 0, 'Risk Management': 0, 'No Mistake': 0
    };
    trades.forEach((t) => {
      if (t.mistake_type && t.mistake_type in mistakeCount) {
        mistakeCount[t.mistake_type]++;
      }
    });

    // Subjective Indicators Scores
    const avgPsychScore = psychologyData.length > 0
      ? psychologyData.reduce((sum, p) => sum + (p.psychological_condition_pct || 0), 0) / psychologyData.length
      : 0;

    const avgRiskScore = riskData.length > 0
      ? riskData.reduce((sum, r) => sum + (r.followed_risk_rules_pct || 0), 0) / riskData.length
      : 0;

    const techByTrade: Record<string, { total: number; yes: number }> = {};
    rulesData.forEach((r) => {
      if (!techByTrade[r.trade_id]) {
        techByTrade[r.trade_id] = { total: 0, yes: 0 };
      }
      techByTrade[r.trade_id].total++;
      if (r.followed === true) {
        techByTrade[r.trade_id].yes++;
      }
    });

    const techScores = Object.values(techByTrade).map((t) => t.total > 0 ? (t.yes / t.total) * 100 : 0);
    const avgTechScore = techScores.length > 0
      ? techScores.reduce((a, b) => a + b, 0) / techScores.length
      : 0;

    const avgOverallScore = (avgTechScore + avgPsychScore + avgRiskScore) / 3;
    const winDaysPct = tradingDaysCount > 0 ? (winDays / tradingDaysCount) * 100 : 0;

    return {
      wins,
      losses,
      breakevens,
      totalTrades,
      totalPnl,
      winRate,
      avgR,
      totalRSum,
      profitFactor,
      avgWin,
      avgLoss,
      avgWinLossRatio,
      largestWinTrade,
      largestLossTrade,
      winDays,
      lossDays,
      beDays,
      tradingDaysCount,
      dntDays,
      largestProfitDay,
      largestLossDay,
      maxWinStreak,
      maxLossStreak,
      equityCurveData,
      execStatusCount,
      mistakeCount,
      avgPsychScore,
      avgRiskScore,
      avgTechScore,
      avgOverallScore,
      winDaysPct
    };
  }, [trades, psychologyData, riskData, rulesData, selectedMonth, selectedYear]);

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

      {/* RIGHT SIDE MAIN CONTAINER */}
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
          <div className="max-w-7xl mx-auto">
            {/* PAGE HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 font-display">
                  Dashboard
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Monthly performance overview — all calculated from your trade data.
                </p>
              </div>

              {/* MONTH/YEAR SELECTORS + BADGE */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  
                  {/* MONTH SELECT */}
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-[#1A1D27] border border-[#2A2D3A] text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer transition-all font-medium"
                  >
                    {MONTH_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>

                  {/* YEAR SELECT */}
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="bg-[#1A1D27] border border-[#2A2D3A] text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer transition-all font-medium font-mono"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* OVERALL SCORE PILL */}
                {!loading && trades.length > 0 && (
                  <div
                    className={`bg-indigo-950/80 border border-indigo-700/60 font-extrabold text-xs uppercase tracking-wider font-mono px-4 py-2.5 rounded-xl shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-950/40 ${getScoreColorClass(
                      stats.avgOverallScore
                    )}`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>YOUR SCORE: {stats.avgOverallScore.toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-b border-[#2A2D3A] mt-5 mb-6" />

            {/* SKELETON LOADER STATE */}
            {loading ? (
              <div className="space-y-6">
                {/* Loader 1: Key Stats Strip */}
                <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl px-5 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <div key={idx} className="flex flex-col items-center space-y-2 animate-pulse">
                        <div className="h-6 w-16 bg-zinc-800 rounded" />
                        <div className="h-3 w-20 bg-zinc-900 rounded" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Loader 2: Equity Curve */}
                <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5 h-[340px] animate-pulse">
                  <div className="flex justify-between mb-4">
                    <div className="h-4 w-36 bg-zinc-800 rounded" />
                    <div className="h-4 w-24 bg-zinc-850 rounded" />
                  </div>
                  <div className="w-full h-[250px] bg-zinc-900/40 rounded-lg" />
                </div>

                {/* Loader 3: Donut cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-4 h-[280px] animate-pulse flex flex-col justify-between">
                      <div className="h-4 w-24 bg-zinc-800 rounded" />
                      <div className="w-28 h-28 rounded-full border-8 border-zinc-800/40 border-t-zinc-750 mx-auto" />
                      <div className="h-3 w-32 bg-zinc-850 rounded mx-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ) : trades.length === 0 ? (
              /* EMPTY PERFORMANCE STATE */
              <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20 shadow-xl">
                <div className="w-16 h-16 bg-zinc-950/60 rounded-full flex items-center justify-center border border-zinc-800 mb-4 animate-pulse">
                  <BarChart2 className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-300 font-display">
                  No trades in {selectedMonth} {selectedYear}
                </h3>
                <p className="text-zinc-500 text-xs mt-1.5 max-w-sm">
                  Log trades to populate performance graphs, metrics radar, streaks analytics, and execution values.
                </p>
                <button
                  onClick={() => navigate('/trade-entry')}
                  className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl px-5 py-3 text-xs uppercase tracking-wider font-mono transition-all shadow-lg shadow-indigo-600/15 cursor-pointer"
                >
                  Log a Trade
                </button>
              </div>
            ) : (
              /* ACTIVE DASHBOARD RENDER OUT */
              <div className="space-y-5">
                {/* SECTION 2: KEY STATS STRIP */}
                <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl px-5 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 divide-y lg:divide-y-0 lg:divide-x divide-[#2A2D3A]">
                    {/* STAT 1 — NET P&L */}
                    <div className="text-center pt-3 lg:pt-0">
                      <div
                        className={`font-mono font-black text-lg md:text-xl truncate ${
                          stats.totalPnl > 0
                            ? 'text-green-400'
                            : stats.totalPnl < 0
                            ? 'text-red-400'
                            : 'text-zinc-400'
                        }`}
                      >
                        {formatINR(stats.totalPnl)}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">
                        Net P&L
                      </div>
                    </div>

                    {/* STAT 2 — TOTAL TRADES */}
                    <div className="text-center pt-3 lg:pt-0 lg:pl-3">
                      <div className="font-mono font-black text-lg md:text-xl text-zinc-100">
                        {stats.totalTrades}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">
                        Total Trades
                      </div>
                      <div className="text-[9px] text-zinc-600 font-mono mt-0.5">
                        {stats.wins.length}W / {stats.losses.length}L / {stats.breakevens.length}BE
                      </div>
                    </div>

                    {/* STAT 3 — WIN RATE */}
                    <div className="text-center pt-3 lg:pt-0 lg:pl-3">
                      <div className={`font-mono font-black text-lg md:text-xl ${getScoreColorClass(stats.winRate)}`}>
                        {stats.winRate.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">
                        Win Rate
                      </div>
                    </div>

                    {/* STAT 4 — PROFIT FACTOR */}
                    <div className="text-center pt-3 lg:pt-0 lg:pl-3">
                      <div
                        className={`font-mono font-black text-lg md:text-xl ${
                          stats.profitFactor > 1.5
                            ? 'text-green-400'
                            : stats.profitFactor >= 1.0
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {stats.profitFactor === 999 ? '∞' : stats.profitFactor.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">
                        Profit Factor
                      </div>
                    </div>

                    {/* STAT 5 — AVG R */}
                    <div className="text-center pt-3 lg:pt-0 lg:pl-3">
                      <div
                        className={`font-mono font-black text-lg md:text-xl ${
                          stats.avgR > 0
                            ? 'text-green-400'
                            : stats.avgR < 0
                            ? 'text-red-400'
                            : 'text-zinc-400'
                        }`}
                      >
                        {stats.avgR >= 0 ? '+' : ''}
                        {stats.avgR.toFixed(2)}R
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">
                        Avg R-Multiple
                      </div>
                    </div>

                    {/* STAT 6 — TRADING DAYS */}
                    <div className="text-center pt-3 lg:pt-0 lg:pl-3">
                      <div className="font-mono font-black text-lg md:text-xl text-zinc-100">
                        {stats.tradingDaysCount}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">
                        Days Traded
                      </div>
                      <div className="text-[9px] text-zinc-600 font-mono mt-0.5">
                        {stats.winDays}W / {stats.lossDays}L / {stats.dntDays} DNT
                      </div>
                    </div>

                    {/* STAT 7 — WIN DAYS % */}
                    <div className="text-center pt-3 lg:pt-0 lg:pl-3">
                      <div className={`font-mono font-black text-lg md:text-xl ${getScoreColorClass(stats.winDaysPct)}`}>
                        {stats.winDaysPct.toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">
                        Win Days
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: EQUITY CURVE */}
                <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <h2 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-1.5">
                      <TrendingUp className="w-5 h-5 text-indigo-400" />
                      Cumulative P&L — {selectedMonth} {selectedYear}
                    </h2>
                    <span
                      className={`font-mono font-extrabold text-sm ${
                        stats.totalPnl > 0
                          ? 'text-green-400'
                          : stats.totalPnl < 0
                          ? 'text-red-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {formatINR(stats.totalPnl)}
                    </span>
                  </div>

                  <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={stats.equityCurveData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="equityUp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="equityDown" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                        <XAxis
                          dataKey="day"
                          tick={{ fill: '#6B7280', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          label={{
                            value: 'Day of Month',
                            position: 'insideBottom',
                            fill: '#4B5563',
                            fontSize: 11,
                            offset: -5,
                          }}
                        />
                        <YAxis
                          tick={{ fill: '#6B7280', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => '₹' + v.toLocaleString('en-IN')}
                          width={80}
                        />
                        <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 4" strokeWidth={1.5} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#1A1D27',
                            border: '1px solid #2A2D3A',
                            borderRadius: '8px',
                            color: '#F9FAFB',
                          }}
                          formatter={(value: any, name: string) => [
                            '₹' + value.toLocaleString('en-IN'),
                            name === 'cumPnl' ? 'Cumulative P&L' : 'Daily P&L',
                          ]}
                          labelFormatter={(label) =>
                            label === '0' ? 'Month Start' : `Day ${label}`
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="cumPnl"
                          stroke={stats.totalPnl >= 0 ? '#22C55E' : '#EF4444'}
                          strokeWidth={2.5}
                          fill={stats.totalPnl >= 0 ? 'url(#equityUp)' : 'url(#equityDown)'}
                          dot={false}
                          activeDot={{ r: 5, fill: '#6366F1', strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* SECTION 4: SIX DONUT CHARTS */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* DONUT 1: TRADING DAYS */}
                  <DonutChart
                    title="Trading Days"
                    data={[
                      { name: 'Win Days', value: stats.winDays, color: '#22C55E' },
                      { name: 'Loss Days', value: stats.lossDays, color: '#EF4444' },
                      { name: 'Did Not Trade', value: stats.dntDays, color: '#374151' }
                    ]}
                    centerPrimary={`${stats.tradingDaysCount}`}
                    centerSecondary="Days Traded"
                  />

                  {/* DONUT 2: WIN RATE */}
                  <DonutChart
                    title="Win Rate"
                    data={[
                      { name: 'Win', value: stats.wins.length, color: '#22C55E' },
                      { name: 'Loss', value: stats.losses.length, color: '#EF4444' },
                      { name: 'Breakeven', value: stats.breakevens.length, color: '#6B7280' }
                    ]}
                    centerPrimary={
                      <span className={getScoreColorClass(stats.winRate)}>
                        {stats.winRate.toFixed(0)}%
                      </span>
                    }
                    centerSecondary="Win Rate"
                  />

                  {/* DONUT 3: EXECUTION QUALITY */}
                  <DonutChart
                    title="Execution Quality"
                    data={[
                      { name: 'Best', value: stats.execStatusCount['BEST TRADE'], color: '#22C55E' },
                      { name: 'Good', value: stats.execStatusCount['GOOD TRADE'], color: '#14B8A6' },
                      { name: 'Average', value: stats.execStatusCount['AVERAGE TRADE'], color: '#EAB308' },
                      { name: 'Poor', value: stats.execStatusCount['POOR TRADE'], color: '#F97316' },
                      { name: 'Bad', value: stats.execStatusCount['BAD TRADE'], color: '#EF4444' }
                    ].filter(d => d.value > 0)}
                    centerPrimary={`${stats.execStatusCount['BEST TRADE'] + stats.execStatusCount['GOOD TRADE']}`}
                    centerSecondary="Best/Good"
                  />

                  {/* DONUT 4: AVG TRADE SIZE */}
                  <DonutChart
                    title="Avg Trade Size"
                    data={[
                      { name: 'Avg Win', value: parseFloat(stats.avgWin.toFixed(2)), color: '#22C55E' },
                      { name: 'Avg Loss', value: parseFloat(stats.avgLoss.toFixed(2)), color: '#EF4444' }
                    ]}
                    centerPrimary={`${stats.avgWinLossRatio === 999 ? '∞' : stats.avgWinLossRatio.toFixed(1)}:1`}
                    centerSecondary="W:L Ratio"
                  />

                  {/* DONUT 5: LARGEST TRADES */}
                  <DonutChart
                    title="Largest Trades"
                    data={[
                      { name: 'Best Trade', value: parseFloat(stats.largestWinTrade.toFixed(2)), color: '#22C55E' },
                      { name: 'Worst Trade', value: parseFloat(stats.largestLossTrade.toFixed(2)), color: '#EF4444' }
                    ]}
                    centerPrimary={
                      <div className="flex flex-col items-center">
                        <span className="text-[12px] font-bold text-green-400 font-mono">
                          +{stats.largestWinTrade > 0 ? (stats.largestWinTrade / 1000).toFixed(1) + 'k' : '—'}
                        </span>
                        <span className="text-[11px] font-bold text-red-400 font-mono mt-0.5">
                          -{stats.largestLossTrade > 0 ? (stats.largestLossTrade / 1000).toFixed(1) + 'k' : '—'}
                        </span>
                      </div>
                    }
                    centerSecondary="Best vs Worst"
                  />

                  {/* DONUT 6: MISTAKES BREAKDOWN */}
                  <DonutChart
                    title="Mistakes"
                    data={[
                      { name: 'Technical', value: stats.mistakeCount.Technical, color: '#6366F1' },
                      { name: 'Psychological', value: stats.mistakeCount.Psychological, color: '#A855F7' },
                      { name: 'Risk Mgmt', value: stats.mistakeCount['Risk Management'], color: '#14B8A6' },
                      { name: 'No Mistake', value: stats.mistakeCount['No Mistake'], color: '#22C55E' }
                    ].filter(d => d.value > 0)}
                    centerPrimary={
                      <span className={stats.mistakeCount.Technical + stats.mistakeCount.Psychological + stats.mistakeCount['Risk Management'] === 0 ? 'text-green-400' : 'text-amber-500'}>
                        {stats.mistakeCount.Technical + stats.mistakeCount.Psychological + stats.mistakeCount['Risk Management']}
                      </span>
                    }
                    centerSecondary="Mistakes Recorded"
                  />
                </div>

                {/* SECTION 5: METRICS + STATS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* LEFT DETAILED STATS */}
                  <div className="lg:col-span-2 bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
                        Monthly Statistics — {selectedMonth} {selectedYear}
                      </h2>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3.5 mt-5">
                        {/* NET PNL | TOTAL TRADES */}
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Net P&L</span>
                          <span className={`text-sm font-mono font-bold ${stats.totalPnl > 0 ? 'text-green-400' : stats.totalPnl < 0 ? 'text-red-400' : 'text-zinc-300'}`}>
                            {formatINR(stats.totalPnl)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Total Trades</span>
                          <span className="text-sm font-semibold text-zinc-100 font-mono">{stats.totalTrades}</span>
                        </div>

                        {/* WIN COUNT | LOSS COUNT */}
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Win Count</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">{stats.wins.length} matches</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Loss Count</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">{stats.losses.length} matches</span>
                        </div>

                        {/* BE COUNT | DNT DAYS */}
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Breakevens</span>
                          <span className="text-sm font-semibold text-zinc-400 font-mono">{stats.breakevens.length} matches</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">DNT Days</span>
                          <span className="text-sm font-semibold text-zinc-400 font-mono">{stats.dntDays} days</span>
                        </div>

                        {/* WIN RATE | WIN DAYS % */}
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Win Rate</span>
                          <span className={`text-sm font-mono font-bold ${getScoreColorClass(stats.winRate)}`}>
                            {stats.winRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Win Days %</span>
                          <span className={`text-sm font-mono font-bold ${getScoreColorClass(stats.winDaysPct)}`}>
                            {stats.winDaysPct.toFixed(1)}%
                          </span>
                        </div>

                        {/* TOTAL PROFIT | TOTAL LOSS */}
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Gross Profit</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.wins.reduce((sum, t) => sum + (t.pnl || 0), 0))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Gross Loss</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.losses.reduce((sum, t) => sum + (t.pnl || 0), 0))}
                          </span>
                        </div>

                        {/* PROFIT FACTOR | AVG WIN/LOSS RATIO */}
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Profit Factor</span>
                          <span className={`text-sm font-mono font-bold ${stats.profitFactor > 1.5 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.profitFactor === 999 ? '∞' : stats.profitFactor.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Avg W:L Ratio</span>
                          <span className="text-sm font-semibold text-zinc-100 font-mono">
                            {stats.avgWinLossRatio === 999 ? '∞' : `${stats.avgWinLossRatio.toFixed(2)}:1`}
                          </span>
                        </div>

                        {/* AVG WIN | AVG LOSS */}
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Avg Win Trade</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.avgWin)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Avg Loss Trade</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.avgLoss)}
                          </span>
                        </div>

                        {/* BEST TRADE | WORST TRADE */}
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Largest Win</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.largestWinTrade)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Largest Loss</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.largestLossTrade)}
                          </span>
                        </div>

                        {/* BEST DAY / WORST DAY */}
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Best Day</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.largestProfitDay)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Worst Day</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.largestLossDay)}
                          </span>
                        </div>

                        {/* STREAKS WIN/LOSS */}
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Best Streak</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">{stats.maxWinStreak} days</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                          <span className="text-xs text-zinc-500">Worst Streak</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">{stats.maxLossStreak} days</span>
                        </div>

                        {/* AVG R | TOTAL R ACCUMULATED */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500">Avg R-Multiple</span>
                          <span className="text-sm font-semibold text-zinc-200 font-mono">{stats.avgR.toFixed(2)}R</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500">Total R Sum</span>
                          <span className="text-sm font-semibold text-zinc-200 font-mono">{stats.totalRSum.toFixed(2)}R</span>
                        </div>
                      </div>
                    </div>

                    {/* PROFIT FACTOR VERTICAL ALIGNED GAUGES */}
                    <div className="mt-6 pt-5 border-t border-[#2A2D3A]">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold text-zinc-400">Profit Factor</span>
                        <span className={`text-xs font-mono font-black ${stats.profitFactor > 1.5 ? 'text-green-400' : 'text-red-400'}`}>
                          {stats.profitFactor === 999 ? '∞' : `${stats.profitFactor.toFixed(2)}x`}
                        </span>
                      </div>
                      <div className="relative w-full h-4 bg-[#0F1117] rounded-full border border-[#2A2D3A] overflow-hidden mb-4">
                        {/* 1.0 Breakeven center marker at 33.3% */}
                        <div className="absolute left-[33.3%] top-0 bottom-0 w-0.5 bg-zinc-600/60 z-10" />
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((stats.profitFactor / 3) * 100, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold text-zinc-400">Avg Win:Loss Ratio</span>
                        <span className="text-xs font-mono font-black text-indigo-400">
                          {stats.avgWinLossRatio === 999 ? '∞' : `${stats.avgWinLossRatio.toFixed(2)}:1`}
                        </span>
                      </div>
                      <div className="relative w-full h-4 bg-[#0F1117] rounded-full border border-[#2A2D3A] overflow-hidden">
                        {/* 1.0 Breakeven center marker at 33.3% */}
                        <div className="absolute left-[33.3%] top-0 bottom-0 w-0.5 bg-zinc-600/60 z-10" />
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((stats.avgWinLossRatio / 3) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT METRICS RADAR */}
                  <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
                        Trading Metrics
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Monthly averages across all trades
                      </p>

                      {/* RADAR RECHARTS */}
                      <div className="w-full h-[220px] mt-4 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            cx="50%"
                            cy="50%"
                            outerRadius="65%"
                            data={[
                              { metric: 'Technical', score: parseFloat(stats.avgTechScore.toFixed(1)) },
                              { metric: 'Psychology', score: parseFloat(stats.avgPsychScore.toFixed(1)) },
                              { metric: 'Risk Mgmt', score: parseFloat(stats.avgRiskScore.toFixed(1)) }
                            ]}
                          >
                            <PolarGrid stroke="#2A2D3A" />
                            <PolarAngleAxis
                              dataKey="metric"
                              tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'Inter' }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tick={{ fill: '#4B5563', fontSize: 9 }}
                              tickCount={4}
                            />
                            <Radar
                              name="Avg Score"
                              dataKey="score"
                              stroke="#6366F1"
                              fill="#6366F1"
                              fillOpacity={0.25}
                              strokeWidth={2}
                              dot={{ fill: '#6366F1', r: 3, strokeWidth: 0 }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* SCORE PROGRESS BARS */}
                      <div className="mt-4 space-y-3">
                        {/* TECHNICAL */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-zinc-400">Technical (Rules)</span>
                            <span className={`text-xs font-mono font-bold ${getScoreColorClass(stats.avgTechScore)}`}>
                              {stats.avgTechScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-[#0F1117] h-2 rounded-full border border-zinc-800/40 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgTechScore}%` }}
                            />
                          </div>
                        </div>

                        {/* PSYCHOLOGY */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-zinc-400">Psychology</span>
                            <span className={`text-xs font-mono font-bold ${getScoreColorClass(stats.avgPsychScore)}`}>
                              {stats.avgPsychScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-[#0F1117] h-2 rounded-full border border-zinc-800/40 overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgPsychScore}%` }}
                            />
                          </div>
                        </div>

                        {/* RISK MANAGEMENT */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-zinc-400">Risk Management</span>
                            <span className={`text-xs font-mono font-bold ${getScoreColorClass(stats.avgRiskScore)}`}>
                              {stats.avgRiskScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-[#0F1117] h-2 rounded-full border border-zinc-800/40 overflow-hidden">
                            <div
                              className="h-full bg-teal-500 rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgRiskScore}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* OVERALL SUMMARY CENTER */}
                    <div className="mt-5 pt-4 border-t border-[#2A2D3A] text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                        YOUR SCORE
                      </div>
                      <div className={`text-5xl font-black tracking-tight mt-1 animate-pulse ${getScoreColorClass(stats.avgOverallScore)}`}>
                        {stats.avgOverallScore.toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono mt-1 uppercase">
                        {selectedMonth} {selectedYear}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 6: CONSECUTIVE DAYS / STREAK CARD */}
                <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5">
                  <h2 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-1.5 mb-5">
                    <Flame className="w-5 h-5 text-amber-500" />
                    Streak Analysis — {selectedMonth} {selectedYear}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#2A2D3A]">
                    {/* WIN STREAK */}
                    <div className="flex items-center gap-5 pt-2 md:pt-0">
                      <div className="w-14 h-14 rounded-2xl bg-green-950/40 border border-green-850/50 flex items-center justify-center text-green-400 shadow-inner">
                        <Trophy className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-green-400 font-mono">
                          {stats.maxWinStreak} {stats.maxWinStreak === 1 ? 'day' : 'days'}
                        </div>
                        <div className="text-sm font-semibold text-zinc-300 mt-0.5">
                          Best Win Streak
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5 uppercase">
                          Consecutive profitable days
                        </div>
                      </div>
                    </div>

                    {/* LOSS STREAK */}
                    <div className="flex items-center gap-5 pt-5 md:pt-0 md:pl-6">
                      <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-850/50 flex items-center justify-center text-red-400 shadow-inner">
                        <TrendingDown className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-red-500 font-mono">
                          {stats.maxLossStreak} {stats.maxLossStreak === 1 ? 'day' : 'days'}
                        </div>
                        <div className="text-sm font-semibold text-zinc-300 mt-0.5">
                          Worst Loss Streak
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5 uppercase">
                          Consecutive losing days
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ADDITIONAL ANALYTICS CONTEXT */}
                  {(stats.largestProfitDay > 0 || stats.largestLossDay > 0) && (
                    <div className="mt-5 pt-4 border-t border-[#2A2D3A]/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span>Largest Profitable Day:</span>
                        <strong className="text-green-400 font-mono">{formatPositiveINR(stats.largestProfitDay)}</strong>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        <span>Largest Losing Day:</span>
                        <strong className="text-red-400 font-mono">{formatPositiveINR(stats.largestLossDay)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 7: VISUAL PATTERN DATABASE / LIBRARY STATS CARD */}
                <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-1.5 font-display">
                        <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                        Visual Pattern Database
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1">
                        CLIP Vision index of your chart screenshots for visual similarity search.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 bg-[#0F1117] border border-[#2A2D3A] rounded-xl px-4 py-2.5">
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold">
                          Global Indexed Charts
                        </div>
                        <div className="text-xl font-black text-indigo-400 font-mono mt-0.5">
                          {visualLibraryCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#2A2D3A] mt-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${confidence.level === 'empty' ? 'bg-zinc-600' : confidence.level === 'building' || confidence.level === 'growing' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                      <span className="text-xs text-zinc-400">
                        Library matching confidence: <strong className={confidence.color}>{confidence.message}</strong>
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 font-mono leading-relaxed max-w-md sm:text-right">
                      CLIP embeds 512-dimensional vector footprints locally in the browser. 
                      Adding more trade screenshots dynamically strengthens matching accuracy for future visual queries.
                    </p>
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
