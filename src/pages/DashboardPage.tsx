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

  const [accentColorState, setAccentColorState] = useState('#06b6d4');
  useEffect(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (color) setAccentColorState(color);
  }, []); // re-read on mount; theme changes trigger re-render via context so this will update

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

  // Score colors rule helper (green >= 70, amber >= 50, red < 50)
  const getScoreColorClass = (score: number) => {
    if (score >= 70) return 'text-[#22c55e] font-bold';
    if (score >= 50) return 'text-[#f59e0b] font-bold';
    return 'text-[#ef4444] font-bold';
  };

  const getPercentTextColor = (score: number) => {
    if (score >= 70) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreBgClass = (score: number) => {
    if (score >= 70) return 'bg-[#22c55e]';
    if (score >= 50) return 'bg-[#f59e0b]';
    return 'bg-[#ef4444]';
  };

  const formatPnlNoDecimals = (value: number) => {
    const formatted = Math.abs(value).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${value < 0 ? '-' : ''}₹${formatted}`;
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) return null;

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || accentColorState || '#06b6d4';
  const gridLineColor = getComputedStyle(document.documentElement).getPropertyValue('--bar').trim() || 'rgba(0,0,0,0.05)';
  const tickColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#a8a29e';

  // Determine chartColor based on final cumulative P&L
  const lastCurvePoint = stats.equityCurveData[stats.equityCurveData.length - 1];
  const finalPnl = lastCurvePoint ? lastCurvePoint.cumPnl : 0;
  const chartColor = finalPnl > 0 ? '#22c55e' : finalPnl < 0 ? '#ef4444' : '#94a3b8';

  const curveValues = stats.equityCurveData.map(d => d.cumPnl);
  const minVal = Math.min(...curveValues, 0);
  const maxVal = Math.max(...curveValues, 0);
  const range = maxVal - minVal;
  const zeroPercent = range > 0 ? (maxVal / range) * 100 : 0;

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
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight font-display" style={{ color: 'var(--text)' }}>
                  Dashboard
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-sub)' }}>
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
                    style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '8px', color: 'var(--text)', padding: '6px 12px' }}
                    className="text-sm focus:outline-none cursor-pointer transition-all font-medium"
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
                    style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '8px', color: 'var(--text)', padding: '6px 12px' }}
                    className="text-sm focus:outline-none cursor-pointer transition-all font-medium font-mono"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ASK AI BUTTON */}
                <button
                  id="dashboard-header-ask-ai"
                  onClick={() => navigate('/ai-teacher')}
                  style={{
                    backgroundColor: 'var(--accent-muted)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  className="shrink-0 transition-all hover:opacity-90 flex items-center justify-center font-sans"
                >
                  Ask AI
                </button>

                {/* OVERALL SCORE PILL */}
                {!loading && trades.length > 0 && (
                  <div
                    style={{
                      backgroundColor: 'var(--accent-muted)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '6px 16px',
                      letterSpacing: '0.3px'
                    }}
                    className="shrink-0 flex items-center gap-1.5 font-mono uppercase tracking-wider shadow-md"
                  >
                    <Activity className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <span>YOUR SCORE: {stats.avgOverallScore.toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-b mt-5 mb-6" style={{ borderColor: 'var(--border)' }} />

            {/* SKELETON LOADER STATE */}
            {loading ? (
              <div className="space-y-6">
                {/* Loader 1: Key Stats Strip as 4 Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '10px' }} className="p-4 h-24 relative overflow-hidden flex flex-col justify-between">
                      <div className="h-3 w-16 skeleton" style={{ borderRadius: '4px' }} />
                      <div className="h-6 w-24 skeleton" style={{ borderRadius: '4px' }} />
                      <div className="h-3 w-20 skeleton" style={{ borderRadius: '4px' }} />
                    </div>
                  ))}
                </div>

                {/* Loader 2: Equity Curve */}
                <div style={{ backgroundColor: 'var(--bar)', borderRadius: '12px' }} className="p-5 h-[340px] relative overflow-hidden flex flex-col justify-between">
                  <div className="flex justify-between mb-4">
                    <div className="h-4 w-36 skeleton" style={{ borderRadius: '4px' }} />
                    <div className="h-4 w-24 skeleton" style={{ borderRadius: '4px' }} />
                  </div>
                  <div className="w-full h-[250px] skeleton" style={{ borderRadius: '12px' }} />
                </div>

                {/* Loader 3: Donut cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} style={{ backgroundColor: 'var(--bar)', borderRadius: '12px' }} className="p-4 h-[280px] flex flex-col justify-between relative overflow-hidden">
                      <div className="h-4 w-24 skeleton" style={{ borderRadius: '4px' }} />
                      <div className="w-28 h-28 rounded-full skeleton mx-auto" />
                      <div className="h-3 w-32 skeleton mx-auto" style={{ borderRadius: '4px' }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : trades.length === 0 ? (
              /* EMPTY PERFORMANCE STATE */
              <div className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20 shadow-xl" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                  <BarChart2 className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold tracking-tight font-display" style={{ color: 'var(--text)' }}>
                  No trades in {selectedMonth} {selectedYear}
                </h3>
                <p className="text-xs mt-1.5 max-w-sm" style={{ color: 'var(--text-sub)' }}>
                  Log trades to populate performance graphs, metrics radar, streaks analytics, and execution values.
                </p>
                <button
                  onClick={() => navigate('/trade-entry')}
                  className="mt-6 hover:opacity-90 text-white font-extrabold rounded-xl px-5 py-3 text-xs uppercase tracking-wider font-mono transition-all shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Log a Trade
                </button>
              </div>
            ) : (
              /* ACTIVE DASHBOARD RENDER OUT */
              <div className="space-y-5">
                {/* SECTION 2: KEY STATS ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1 — NET P&L */}
                  <div className="p-[14px] px-[18px] rounded-[10px]" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                      NET P&L
                    </div>
                    <div className="text-[26px] font-bold tracking-tight font-sans leading-none" style={{ color: stats.totalPnl > 0 ? '#22c55e' : stats.totalPnl < 0 ? '#ef4444' : 'var(--text)', letterSpacing: '-0.5px' }}>
                      {formatPnlNoDecimals(stats.totalPnl)}
                    </div>
                    <div className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-sub)' }}>
                      This month
                    </div>
                  </div>

                  {/* Card 2 — TOTAL TRADES */}
                  <div className="p-[14px] px-[18px] rounded-[10px]" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                      TOTAL TRADES
                    </div>
                    <div className="text-[26px] font-bold tracking-tight font-sans leading-none" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>
                      {stats.totalTrades}
                    </div>
                    <div className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--text-sub)' }}>
                      W: {stats.wins.length} &middot; L: {stats.losses.length} &middot; BE: {stats.breakevens.length}
                    </div>
                  </div>

                  {/* Card 3 — WIN RATE */}
                  <div className="p-[14px] px-[18px] rounded-[10px]" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                      WIN RATE
                    </div>
                    <div className="text-[26px] font-bold tracking-tight font-sans leading-none" style={{ color: 'var(--accent)', letterSpacing: '-0.5px' }}>
                      {stats.winRate.toFixed(0)}%
                    </div>
                    <div className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-sub)' }}>
                      Win days this month
                    </div>
                  </div>

                  {/* Card 4 — PROFIT FACTOR */}
                  <div className="p-[14px] px-[18px] rounded-[10px]" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                      PROFIT FACTOR
                    </div>
                    <div className="text-[26px] font-bold tracking-tight font-sans leading-none" style={{ color: stats.profitFactor > 1.5 ? '#22c55e' : stats.profitFactor > 1.0 ? '#f59e0b' : '#ef4444', letterSpacing: '-0.5px' }}>
                      {stats.profitFactor === 999 ? '∞' : stats.profitFactor.toFixed(2)}
                    </div>
                    <div className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-sub)' }}>
                      Target: &gt;1.5
                    </div>
                  </div>
                </div>

                {/* SECTION 3: EQUITY CURVE */}
                <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', paddingBottom: '16px', overflow: 'visible' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <h2 className="text-lg font-semibold tracking-tight flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                      <TrendingUp className="w-5 h-5" style={{ color: chartColor }} />
                      Cumulative P&L — {selectedMonth} {selectedYear}
                    </h2>
                    <span
                      className={`font-mono font-extrabold text-sm ${
                        stats.totalPnl > 0
                          ? 'text-[#22c55e]'
                          : stats.totalPnl < 0
                          ? 'text-[#ef4444]'
                          : ''
                      }`}
                      style={{ color: stats.totalPnl === 0 ? 'var(--text-sub)' : undefined }}
                    >
                      {formatINR(stats.totalPnl)}
                    </span>
                  </div>

                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={stats.equityCurveData}
                        margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                      >
                        <defs>
                          {/* Area fill gradient — green above zero, red below zero */}
                          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                            <stop offset={`${zeroPercent}%`} stopColor="#22c55e" stopOpacity={0.08} />
                            <stop offset={`${zeroPercent}%`} stopColor="#ef4444" stopOpacity={0.08} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.15} />
                          </linearGradient>

                          {/* Line stroke gradient — green above zero, red below zero */}
                          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                            <stop offset={`${zeroPercent}%`} stopColor="#22c55e" stopOpacity={1} />
                            <stop offset={`${zeroPercent}%`} stopColor="#ef4444" stopOpacity={1} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridLineColor} vertical={false} />
                        <XAxis
                          dataKey="day"
                          tick={{ fontSize: 10, fill: tickColor }}
                          tickLine={false}
                          axisLine={{ stroke: 'var(--border)' }}
                          label={{
                            value: 'Day of Month',
                            position: 'insideBottom',
                            offset: -15,
                            style: { fontSize: 10, fill: tickColor }
                          }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: tickColor }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`}
                          width={80}
                        />
                        <ReferenceLine
                          y={0}
                          stroke="rgba(0,0,0,0.15)"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'var(--card)',
                            border: '0.5px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--text)',
                          }}
                          formatter={(value: any, name: string) => {
                            const decimalValue = Number(value) || 0;
                            const isPositive = decimalValue >= 0;
                            return [
                              <span key="val" style={{ color: isPositive ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                                {'₹' + value.toLocaleString('en-IN')}
                              </span>,
                              name === 'cumPnl' ? 'Cumulative P&L' : 'Daily P&L',
                            ];
                          }}
                          labelFormatter={(label) =>
                            label === '0' ? 'Month Start' : `Day ${label}`
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="cumPnl"
                          stroke="url(#lineGradient)"
                          strokeWidth={2}
                          fill="url(#areaGradient)"
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            const val = payload?.cumPnl ?? payload?.value ?? 0;
                            const color = val >= 0 ? '#22c55e' : '#ef4444';
                            return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} strokeWidth={0} />;
                          }}
                          activeDot={(props: any) => {
                            const { cx, cy, payload } = props;
                            const val = payload?.cumPnl ?? payload?.value ?? 0;
                            const color = val >= 0 ? '#22c55e' : '#ef4444';
                            return <circle key={`active-dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={color} strokeWidth={0} />;
                          }}
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
                  <div className="lg:col-span-2 rounded-xl p-5 flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
                        Monthly Statistics — {selectedMonth} {selectedYear}
                      </h2>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3.5 mt-5">
                        {/* NET PNL | TOTAL TRADES */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Net P&L</span>
                          <span className={`text-sm font-mono font-bold ${stats.totalPnl > 0 ? 'text-green-400' : stats.totalPnl < 0 ? 'text-red-400' : ''}`} style={{ color: stats.totalPnl === 0 ? 'var(--text-sub)' : undefined }}>
                            {formatINR(stats.totalPnl)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Trades</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{stats.totalTrades}</span>
                        </div>

                        {/* WIN COUNT | LOSS COUNT */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Win Count</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">{stats.wins.length} matches</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loss Count</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">{stats.losses.length} matches</span>
                        </div>

                        {/* BE COUNT | DNT DAYS */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Breakevens</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-sub)' }}>{stats.breakevens.length} matches</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>DNT Days</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-sub)' }}>{stats.dntDays} days</span>
                        </div>

                        {/* WIN RATE | WIN DAYS % */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Win Rate</span>
                          <span className={`text-sm font-mono font-bold ${getScoreColorClass(stats.winRate)}`}>
                            {stats.winRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Win Days %</span>
                          <span className={`text-sm font-mono font-bold ${getScoreColorClass(stats.winDaysPct)}`}>
                            {stats.winDaysPct.toFixed(1)}%
                          </span>
                        </div>

                        {/* TOTAL PROFIT | TOTAL LOSS */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Gross Profit</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.wins.reduce((sum, t) => sum + (t.pnl || 0), 0))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Gross Loss</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.losses.reduce((sum, t) => sum + (t.pnl || 0), 0))}
                          </span>
                        </div>

                        {/* PROFIT FACTOR | AVG WIN/LOSS RATIO */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Profit Factor</span>
                          <span className={`text-sm font-mono font-bold ${stats.profitFactor > 1.5 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.profitFactor === 999 ? '∞' : stats.profitFactor.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg W:L Ratio</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>
                            {stats.avgWinLossRatio === 999 ? '∞' : `${stats.avgWinLossRatio.toFixed(2)}:1`}
                          </span>
                        </div>

                        {/* AVG WIN | AVG LOSS */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Win Trade</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.avgWin)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Loss Trade</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.avgLoss)}
                          </span>
                        </div>

                        {/* BEST TRADE | WORST TRADE */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Largest Win</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.largestWinTrade)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Largest Loss</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.largestLossTrade)}
                          </span>
                        </div>

                        {/* BEST DAY / WORST DAY */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Best Day</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.largestProfitDay)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Worst Day</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.largestLossDay)}
                          </span>
                        </div>

                        {/* STREAKS WIN/LOSS */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Best Streak</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">{stats.maxWinStreak} days</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Worst Streak</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">{stats.maxLossStreak} days</span>
                        </div>

                        {/* AVG R | TOTAL R ACCUMULATED */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg R-Multiple</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{stats.avgR.toFixed(2)}R</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total R Sum</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{stats.totalRSum.toFixed(2)}R</span>
                        </div>
                      </div>
                    </div>

                    {/* PROFIT FACTOR VERTICAL ALIGNED GAUGES */}
                    <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Profit Factor</span>
                        <span className={`text-xs font-mono font-black ${stats.profitFactor > 1.5 ? 'text-green-400' : 'text-red-400'}`}>
                          {stats.profitFactor === 999 ? '∞' : `${stats.profitFactor.toFixed(2)}x`}
                        </span>
                      </div>
                      <div className="relative w-full h-4 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                        {/* 1.0 Breakeven center marker at 33.3% */}
                        <div className="absolute left-[33.3%] top-0 bottom-0 w-0.5 bg-zinc-450 z-10" />
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((stats.profitFactor / 3) * 100, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Avg Win:Loss Ratio</span>
                        <span className="text-xs font-mono font-black text-indigo-500">
                          {stats.avgWinLossRatio === 999 ? '∞' : `${stats.avgWinLossRatio.toFixed(2)}:1`}
                        </span>
                      </div>
                      <div className="relative w-full h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                        {/* 1.0 Breakeven center marker at 33.3% */}
                        <div className="absolute left-[33.3%] top-0 bottom-0 w-0.5 bg-zinc-450 z-10" />
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((stats.avgWinLossRatio / 3) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT METRICS RADAR */}
                  <div className="rounded-xl p-5 flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
                        Trading Metrics
                      </h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
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
                            <PolarGrid stroke="var(--bar)" />
                            <PolarAngleAxis
                              dataKey="metric"
                              tick={{ fill: 'var(--text-sub)', fontSize: 11, fontFamily: 'Inter' }}
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
                              stroke="var(--accent)"
                              fill="var(--accent)"
                              fillOpacity={0.18}
                              strokeWidth={1.5}
                              dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* SCORE PROGRESS BARS */}
                      <div className="mt-4 space-y-3">
                        {/* TECHNICAL */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Technical (Rules)</span>
                            <span className="text-xs font-mono font-bold" style={{ color: getPercentTextColor(stats.avgTechScore) }}>
                              {stats.avgTechScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgTechScore}%`, backgroundColor: 'var(--accent)' }}
                            />
                          </div>
                        </div>

                        {/* PSYCHOLOGY */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Psychology</span>
                            <span className="text-xs font-mono font-bold" style={{ color: getPercentTextColor(stats.avgPsychScore) }}>
                              {stats.avgPsychScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgPsychScore}%`, backgroundColor: 'var(--accent)' }}
                            />
                          </div>
                        </div>

                        {/* RISK MANAGEMENT */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Risk Management</span>
                            <span className="text-xs font-mono font-bold" style={{ color: getPercentTextColor(stats.avgRiskScore) }}>
                              {stats.avgRiskScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgRiskScore}%`, backgroundColor: 'var(--accent)' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* OVERALL SUMMARY CENTER */}
                    <div className="mt-5 pt-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                      <div className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>
                        YOUR SCORE
                      </div>
                      <div className={`text-5xl font-black tracking-tight mt-1 animate-pulse ${getScoreColorClass(stats.avgOverallScore)}`}>
                        {stats.avgOverallScore.toFixed(0)}%
                      </div>
                      <div className="text-[10px] font-mono mt-1 uppercase" style={{ color: 'var(--text-muted)' }}>
                        {selectedMonth} {selectedYear}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 6: CONSECUTIVE DAYS / STREAK CARD */}
                <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
                  <h2 className="text-lg font-semibold tracking-tight flex items-center gap-1.5 mb-5" style={{ color: 'var(--text)' }}>
                    <Flame className="w-5 h-5 text-amber-500" />
                    Streak Analysis — {selectedMonth} {selectedYear}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--border)' }}>
                    {/* WIN STREAK */}
                    <div className="flex items-center gap-5 pt-2 md:pt-0">
                      <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shadow-inner">
                        <Trophy className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-green-500 font-mono">
                          {stats.maxWinStreak} {stats.maxWinStreak === 1 ? 'day' : 'days'}
                        </div>
                        <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-sub)' }}>
                          Best Win Streak
                        </div>
                        <div className="text-[11px] font-mono mt-0.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                          Consecutive profitable days
                        </div>
                      </div>
                    </div>

                    {/* LOSS STREAK */}
                    <div className="flex items-center gap-5 pt-5 md:pt-0 md:pl-6" style={{ borderColor: 'var(--border)' }}>
                      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
                        <TrendingDown className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-red-500 font-mono">
                          {stats.maxLossStreak} {stats.maxLossStreak === 1 ? 'day' : 'days'}
                        </div>
                        <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-sub)' }}>
                          Worst Loss Streak
                        </div>
                        <div className="text-[11px] font-mono mt-0.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                          Consecutive losing days
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ADDITIONAL ANALYTICS CONTEXT */}
                  {(stats.largestProfitDay > 0 || stats.largestLossDay > 0) && (
                    <div className="mt-5 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-sub)' }}>
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span>Largest Profitable Day:</span>
                        <strong className="text-green-500 font-mono">{formatPositiveINR(stats.largestProfitDay)}</strong>
                      </div>
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-sub)' }}>
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        <span>Largest Losing Day:</span>
                        <strong className="text-red-500 font-mono">{formatPositiveINR(stats.largestLossDay)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 7: VISUAL PATTERN DATABASE / LIBRARY STATS CARD */}
                <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-1.5 font-display" style={{ color: 'var(--text)' }}>
                        <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                        Visual Pattern Database
                      </h2>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-sub)' }}>
                        CLIP Vision index of your chart screenshots for visual similarity search.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl px-4 py-2.5" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                          Global Indexed Charts
                        </div>
                        <div className="text-xl font-black text-indigo-500 font-mono mt-0.5">
                          {visualLibraryCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t mt-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${confidence.level === 'empty' ? 'bg-zinc-600' : confidence.level === 'building' || confidence.level === 'growing' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                      <span className="text-xs" style={{ color: 'var(--text-sub)' }}>
                        Library matching confidence: <strong className={confidence.color}>{confidence.message}</strong>
                      </span>
                    </div>

                    <p className="text-[11px] font-mono leading-relaxed max-w-md sm:text-right" style={{ color: 'var(--text-muted)' }}>
                      CLIP embeds 512-dimensional vector footprints locally in the browser. 
                      Adding more trade screenshots dynamically strengthens matching accuracy for future visual queries.
                    </p>
                  </div>
                </div>

                {/* SECTION 8: RECENT TRADES */}
                <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
                  <h2 className="text-lg font-semibold tracking-tight flex items-center gap-1.5 mb-4 font-display" style={{ color: 'var(--text)' }}>
                    Recent Trades — {selectedMonth} {selectedYear}
                  </h2>
                  {trades.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No logged trades found for this period.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                            <th className="pb-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Date</th>
                            <th className="pb-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Symbol</th>
                            <th className="pb-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Type</th>
                            <th className="pb-3 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-muted)' }}>P&L</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                          {trades.slice().reverse().slice(0, 5).map((trade: any) => (
                            <tr
                              key={trade.id}
                              className="transition-colors duration-120"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--row)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <td className="py-3 font-mono" style={{ color: 'var(--text)' }}>
                                {trade.trade_date ? new Date(trade.trade_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                              </td>
                              <td className="py-3 font-bold" style={{ color: 'var(--text)' }}>
                                {trade.symbol}
                              </td>
                              <td className="py-3 font-sans">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${trade.direction === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                  {trade.direction}
                                </span>
                              </td>
                              <td className={`py-3 font-mono font-bold text-right ${trade.pnl > 0 ? 'text-[#22c55e]' : trade.pnl < 0 ? 'text-[#ef4444]' : ''}`} style={{ color: trade.pnl === 0 ? 'var(--text-sub)' : undefined }}>
                                {formatINR(trade.pnl)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
