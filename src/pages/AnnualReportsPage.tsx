import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import {
  Menu,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  BarChart2,
  ArrowRight
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts';
import {
  calcTradeStats,
  calcScoreAverages,
  MONTH_NAMES,
  scoreColor,
  pnlColor,
  formatINR,
  formatINRShort
} from '../lib/calculations';

export const AnnualReportsPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();

  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const [trades, setTrades] = useState<any[]>([]);
  const [psychologyData, setPsychologyData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [rulesData, setRulesData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Safety Redirect
  useEffect(() => {
    if (!authLoading && !userId) {
      navigate('/login');
    }
  }, [userId, authLoading, navigate]);

  // Fetch unique years for selector
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

  // Fetch Trades & Compliances
  useEffect(() => {
    if (!userId) return;

    const fetchAnnualData = async () => {
      try {
        setLoading(true);

        const { data: tradesData, error: tradesError } = await supabase
          .from('trades')
          .select('*, strategies(name, type_of_strategy)')
          .eq('user_id', userId)
          .eq('year', selectedYear)
          .order('date', { ascending: true });

        if (tradesError) throw tradesError;

        const fetchedTrades = tradesData || [];
        setTrades(fetchedTrades);

        if (fetchedTrades.length === 0) {
          setPsychologyData([]);
          setRiskData([]);
          setRulesData([]);
          setLoading(false);
          return;
        }

        const tradeIds = fetchedTrades.map((t: any) => t.id);

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

        setPsychologyData(psychRes.data || []);
        setRiskData(riskRes.data || []);
        setRulesData(rulesRes.data || []);

      } catch (err: any) {
        console.error('Annual performance sync error:', err);
        showError(err.message || 'Failed to fetch annual reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnualData();
  }, [userId, selectedYear, showError]);

  // Calculations
  const calculatedContext = useMemo(() => {
    const annualStats = calcTradeStats(trades);
    const tradeIds = trades.map((t: any) => t.id);
    const annualScores = calcScoreAverages(tradeIds, psychologyData, riskData, rulesData);

    // Group trades by month
    const monthlyData = MONTH_NAMES.map(month => {
      const monthTrades = trades.filter((t: any) => t.month === month);
      const stats = monthTrades.length > 0 ? calcTradeStats(monthTrades) : null;

      // Calculate score for this specific month
      let monthScores = null;
      if (monthTrades.length > 0) {
        const mTradeIds = monthTrades.map((t: any) => t.id);
        const mPsych = psychologyData.filter((p: any) => mTradeIds.includes(p.trade_id));
        const mRisk = riskData.filter((r: any) => mTradeIds.includes(r.trade_id));
        const mRules = rulesData.filter((ru: any) => mTradeIds.includes(ru.trade_id));
        monthScores = calcScoreAverages(mTradeIds, mPsych, mRisk, mRules);
      }

      return {
        month,
        trades: monthTrades,
        stats,
        scores: monthScores
      };
    });

    // Annual equity curve (cumulative by month)
    let annualCumulative = 0;
    const annualEquityData = monthlyData.map(m => {
      const monthPnl = m.stats ? m.stats.totalPnl : 0;
      annualCumulative += monthPnl;
      return {
        month: m.month,
        monthPnl: parseFloat(monthPnl.toFixed(2)),
        cumPnl: parseFloat(annualCumulative.toFixed(2))
      };
    });

    // Best and worst month by totalPnl (from months with trades)
    const monthsWithData = monthlyData.filter(m => m.stats && m.trades.length > 0);
    const bestMonth = monthsWithData.length > 0
      ? monthsWithData.reduce((a, b) => ((a.stats?.totalPnl ?? 0) > (b.stats?.totalPnl ?? 0) ? a : b))
      : null;
    const worstMonth = monthsWithData.length > 0
      ? monthsWithData.reduce((a, b) => ((a.stats?.totalPnl ?? 0) < (b.stats?.totalPnl ?? 0) ? a : b))
      : null;

    // Setup performance breakdown
    const setupMap: Record<string, { trades: any[]; pnl: number }> = {};
    trades.forEach((t: any) => {
      const name = t.strategies?.name || 'No Setup';
      if (!setupMap[name]) {
        setupMap[name] = { trades: [], pnl: 0 };
      }
      setupMap[name].trades.push(t);
      setupMap[name].pnl += (t.pnl || 0);
    });

    const setupList = Object.entries(setupMap).map(([name, d]) => ({
      name,
      tradeCount: d.trades.length,
      pnl: d.pnl,
      winRate: (d.trades.filter(t => t.status === 'Win').length / d.trades.length) * 100
    })).sort((a, b) => b.pnl - a.pnl);

    const bestSetup = setupList[0] || null;
    const worstSetup = setupList[setupList.length - 1] || null;

    // Most common mistake that isn't 'No Mistake'
    const mistakeCount: Record<string, number> = {};
    trades.filter((t: any) => t.mistake_text && t.mistake_type && t.mistake_type !== 'No Mistake').forEach((t: any) => {
      mistakeCount[t.mistake_text] = (mistakeCount[t.mistake_text] || 0) + 1;
    });
    const topMistakeEntry = Object.entries(mistakeCount).sort((a, b) => b[1] - a[1])[0] || null;

    return {
      annualStats,
      annualScores,
      monthlyData,
      annualEquityData,
      monthsWithData,
      bestMonth,
      worstMonth,
      setupList,
      bestSetup,
      worstSetup,
      topMistakeEntry
    };
  }, [trades, psychologyData, riskData, rulesData]);

  const {
    annualStats,
    annualScores,
    monthlyData,
    annualEquityData,
    monthsWithData,
    bestMonth,
    worstMonth,
    setupList,
    bestSetup,
    worstSetup,
    topMistakeEntry
  } = calculatedContext;

  const getScoreColor = (v: number) => {
    if (v >= 70) return 'text-green-400';
    if (v >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (v: number) => {
    if (v >= 70) return 'bg-green-500';
    if (v >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans selection:bg-indigo-500/30" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user?.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT SIDE CONTENT CONTAINER */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
        {/* MOBILE HEADER */}
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
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* HEADER AREA */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }} className="font-display tracking-tight">
                  Annual Reports
                </h1>
                <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-sub)' }} className="mt-1">
                  Full year analysis — all calculations from your trade data.
                </p>
              </div>

              {/* YEAR SELECTOR */}
              <div className="flex items-center gap-2">
                <Calendar style={{ color: 'var(--text-muted)' }} className="w-4 h-4" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--text)',
                    padding: '6px 12px'
                  }}
                  className="font-medium font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ borderColor: 'var(--border)' }} className="border-b mt-5 mb-6" />

            {/* SKELETON DISPLAY STATE */}
            {loading ? (
              <div className="space-y-6">
                <div className="h-16 rounded-xl skeleton" />
                <div className="h-72 rounded-xl skeleton" />
                <div className="h-[400px] rounded-xl skeleton" />
              </div>
            ) : trades.length === 0 ? (
              /* EMPTY YEAR STATE */
              <div
                style={{
                  background: 'var(--card)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: '12px'
                }}
                className="p-12 text-center flex flex-col items-center justify-center py-20"
              >
                <div style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }} className="w-16 h-16 rounded-full flex items-center justify-center border mb-4">
                  <BarChart2 style={{ color: 'var(--text-muted)' }} className="w-8 h-8" />
                </div>
                <h3 style={{ color: 'var(--text)' }} className="text-xl font-bold tracking-tight font-display">
                  No trades in {selectedYear}
                </h3>
                <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-sub)' }} className="mt-1.5 max-w-sm font-sans">
                  To view interactive charts, month-over-month summaries, and automated compliance reports, log trades for this year.
                </p>
                <button
                  onClick={() => navigate('/trade-entry')}
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  className="mt-6 hover:opacity-90 font-sans transition-all inline-flex items-center gap-1.5"
                >
                  Log a Trade <ArrowRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              /* ACTIVE COMPREHENSIVE ANNUAL DISPLAY */
              <div className="space-y-6 animate-fade-in">
                                {/* SECTION 1: ANNUAL STATS STRIP CARD */}
                {annualStats && (
                  <div
                    style={{
                      background: 'var(--card)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '12px'
                    }}
                    className="p-5"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-y-4 md:gap-y-0 text-center">
                      
                      {/* STAT Card: NET P&L */}
                      <div className="p-3 flex flex-col justify-center" style={{ borderRight: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="font-sans">Net P&L</span>
                        <span style={{ fontSize: '26px', fontWeight: 700, color: annualStats.totalPnl >= 0 ? '#22c55e' : '#ef4444' }} className="font-mono mt-1">
                          {formatINR(annualStats.totalPnl)}
                        </span>
                      </div>

                      {/* STAT Card: TOTAL TRADES */}
                      <div className="p-3 flex flex-col justify-center" style={{ borderRight: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="font-sans">Total Trades</span>
                        <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)' }} className="font-mono mt-1">
                          {annualStats.totalTrades}
                        </span>
                      </div>

                      {/* STAT Card: WIN RATE */}
                      <div className="p-3 flex flex-col justify-center" style={{ borderRight: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="font-sans">Win Rate</span>
                        <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--accent)' }} className="font-mono mt-1">
                          {annualStats.winRate.toFixed(1)}%
                        </span>
                      </div>

                      {/* STAT Card: PROFIT FACTOR */}
                      <div className="p-3 flex flex-col justify-center" style={{ borderRight: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="font-sans">Profit Factor</span>
                        <span style={{ fontSize: '26px', fontWeight: 700, color: annualStats.profitFactor >= 1.0 ? 'var(--accent)' : '#ef4444' }} className="font-mono mt-1">
                          {annualStats.profitFactor === 999 ? '∞' : annualStats.profitFactor.toFixed(2)}
                        </span>
                      </div>

                      {/* STAT Card: AVG R */}
                      <div className="p-3 flex flex-col justify-center" style={{ borderRight: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="font-sans">Avg R</span>
                        <span style={{ fontSize: '26px', fontWeight: 700, color: annualStats.avgR >= 0 ? '#22c55e' : '#ef4444' }} className="font-mono mt-1">
                          {annualStats.avgR >= 0 ? '+' : ''}{annualStats.avgR.toFixed(2)}R
                        </span>
                      </div>

                      {/* STAT Card: ACTIVE MONTHS */}
                      <div className="p-3 flex flex-col justify-center" style={{ borderRight: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="font-sans">Active Months</span>
                        <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)' }} className="font-mono mt-1">
                          {monthsWithData.length} / 12
                        </span>
                      </div>

                      {/* STAT Card: OVERALL SCORE */}
                      <div className="p-3 flex flex-col justify-center">
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="font-sans">Compliance</span>
                        <span style={{ fontSize: '26px', fontWeight: 700, color: annualScores.avgOverall >= 70 ? '#22c55e' : annualScores.avgOverall >= 50 ? 'var(--accent)' : '#ef4444' }} className="font-mono mt-1">
                          {annualScores.avgOverall.toFixed(0)}%
                        </span>
                      </div>

                    </div>
                  </div>
                )}

                {/* SECTION 2: ANNUAL EQUITY CURVE + MONTHLY P&L COMBO CHART */}
                {annualStats && (
                  <div
                    style={{
                      background: 'var(--card)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '12px'
                    }}
                    className="p-5"
                  >
                    <div style={{ borderColor: 'var(--border)' }} className="flex items-center justify-between border-b pb-3 mb-4">
                      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }} className="tracking-tight">
                        Annual P&L Performance
                      </h2>
                      <span style={{ color: '#22c55e', fontWeight: 600 }} className="font-mono text-sm">
                        Cumulative Year P&L: {formatINR(annualStats.totalPnl)}
                      </span>
                    </div>

                    <div className="w-full">
                      <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={annualEquityData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--bar)" vertical={false} />
                          <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                                 tickFormatter={v => '₹' + (v/1000).toFixed(0) + 'k'} width={55} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                 axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v/1000).toFixed(0) + 'k'} width={55} />
                          <ReferenceLine yAxisId="left" y={0} stroke="var(--border)" strokeDasharray="4 4" />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '12px' }}
                            formatter={(value: any, name: any) => [formatINR(value), name === 'monthPnl' ? 'Monthly P&L' : 'Cumulative P&L']}
                          />
                          <Legend wrapperStyle={{ color: 'var(--text-sub)', fontSize: '12px' }} />
                          <Bar yAxisId="left" dataKey="monthPnl" name="Monthly P&L" radius={[4, 4, 0, 0]}
                               fill="var(--accent)" fillOpacity={0.7}>
                            {annualEquityData.map((entry, i) => (
                              <Cell key={i} fill={entry.monthPnl >= 0 ? 'var(--accent)' : '#ef4444'} fillOpacity={0.7} />
                            ))}
                          </Bar>
                          <Line yAxisId="right" type="monotone" dataKey="cumPnl" name="Cumulative P&L"
                                stroke="var(--accent)" strokeWidth={2.5} dot={{ fill: 'var(--accent)', r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* SECTION 3: 12-MONTH PERFORMANCE TABLE */}
                <div
                  style={{
                    background: 'var(--card)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '12px'
                  }}
                  className="p-5"
                >
                  <div style={{ borderColor: 'var(--border)' }} className="border-b pb-3 mb-4">
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }} className="tracking-tight">
                      Month-by-Month Performance
                    </h2>
                  </div>

                  <div
                    style={{
                      background: 'var(--card)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}
                    className="overflow-x-auto"
                  >
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr style={{ background: 'rgba(0, 0, 0, 0.04)', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                          <th className="px-4 py-3" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Month</th>
                          <th className="px-4 py-3 text-center" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Trades</th>
                          <th className="px-4 py-3 text-center" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Win</th>
                          <th className="px-4 py-3 text-center" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Loss</th>
                          <th className="px-4 py-3 text-center" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Win Rate</th>
                          <th className="px-4 py-3 text-right" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>P&L</th>
                          <th className="px-4 py-3 text-right" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Avg R</th>
                          <th className="px-4 py-3 text-center" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>PF</th>
                          <th className="px-4 py-3 text-center" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.map(({ month, trades: monthTrades, stats: mStats, scores: mScores }, idx) => {
                          const isBest = bestMonth && bestMonth.month === month;
                          const isWorst = worstMonth && worstMonth.month === month;

                          const customStyle: React.CSSProperties = {
                            borderColor: 'var(--border)',
                            background: idx % 2 === 1 ? 'rgba(0, 0, 0, 0.018)' : 'transparent',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                            borderTop: idx === 0 ? '1px solid rgba(0, 0, 0, 0.06)' : undefined,
                          };

                          if (mStats && mStats.totalTrades > 0) {
                            if (isBest) {
                              customStyle.borderLeft = '3px solid #22c55e';
                            } else if (isWorst) {
                              customStyle.borderLeft = '3px solid #ef4444';
                            }
                          }

                          if (!mStats || monthTrades.length === 0) {
                            return (
                              <tr
                                key={month}
                                style={{ 
                                  borderColor: 'var(--border)',
                                  background: idx % 2 === 1 ? 'rgba(0, 0, 0, 0.018)' : 'transparent',
                                  borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                                  borderTop: idx === 0 ? '1px solid rgba(0, 0, 0, 0.06)' : undefined,
                                }}
                                className="border-b text-zinc-400 transition-colors hover:bg-[rgba(0, 0, 0, 0.03)] cursor-pointer"
                              >
                                <td style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }} className="px-4 py-3">{month}</td>
                                <td className="px-4 py-3 text-center font-mono">—</td>
                                <td className="px-4 py-3 text-center font-mono">—</td>
                                <td className="px-4 py-3 text-center font-mono">—</td>
                                <td className="px-4 py-3 text-center font-mono">—</td>
                                <td className="px-4 py-3 text-right font-mono">—</td>
                                <td className="px-4 py-3 text-right font-mono">—</td>
                                <td className="px-4 py-3 text-center font-mono">—</td>
                                <td className="px-4 py-3 text-center font-mono">—</td>
                              </tr>
                            );
                          }

                          return (
                            <tr
                              key={month}
                              style={customStyle}
                              className="border-b transition-colors hover:bg-[rgba(0, 0, 0, 0.03)] cursor-pointer"
                            >
                              {/* Month Name */}
                              <td style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }} className="px-4 py-3 flex items-center gap-1">
                                <span>{month}</span>
                                {isBest && (
                                  <span className="bg-green-500/10 text-green-600 text-[9px] font-bold rounded-lg px-2 py-0.5 border border-green-500/20 whitespace-nowrap">
                                    ★ Best
                                  </span>
                                )}
                                {isWorst && (
                                  <span className="bg-red-500/10 text-red-600 text-[9px] font-bold rounded-lg px-2 py-0.5 border border-red-500/20 whitespace-nowrap">
                                    ↓ Worst
                                  </span>
                                )}
                              </td>

                              {/* Trades Count */}
                              <td style={{ color: 'var(--text)' }} className="px-4 py-3 text-center font-mono text-xs">
                                {mStats.totalTrades}
                              </td>

                              {/* Win count */}
                              <td className="px-4 py-3 text-center font-mono font-semibold text-xs" style={{ color: '#22c55e' }}>
                                {mStats.wins}
                              </td>

                              {/* Loss Count */}
                              <td className="px-4 py-3 text-center font-mono font-semibold text-xs" style={{ color: '#ef4444' }}>
                                {mStats.losses}
                              </td>

                              {/* Win Rate */}
                              <td
                                style={{ color: 'var(--accent)', fontWeight: 600 }}
                                className="px-4 py-3 text-center font-mono text-xs"
                              >
                                {mStats.winRate.toFixed(0)}%
                              </td>

                              {/* Month overall P&L */}
                              <td
                                style={{ 
                                  color: mStats.totalPnl >= 0 ? '#22c55e' : '#ef4444', 
                                  fontWeight: 600 
                                }}
                                className="px-4 py-3 text-right font-mono text-xs"
                              >
                                {formatINR(mStats.totalPnl)}
                              </td>

                              {/* Average R Multiple */}
                              <td className={`px-4 py-3 text-right font-mono text-xs ${pnlColor(mStats.avgR)}`}>
                                {mStats.avgR >= 0 ? '+' : ''}{mStats.avgR.toFixed(2)}R
                              </td>

                              {/* Profit Factor */}
                              <td className={`px-4 py-3 text-center font-mono text-xs font-semibold ${
                                mStats.profitFactor >= 1.0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {mStats.profitFactor === 999 ? '∞' : mStats.profitFactor.toFixed(1)}
                              </td>

                              {/* Score Metric */}
                              <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                                {mScores ? (
                                  <span className={`font-black font-mono ${getScoreColor(mScores.avgOverall)}`}>
                                    {mScores.avgOverall.toFixed(0)}%
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>

                      {/* ANNUAL TOTAL FOOTER ROW */}
                      {annualStats && (
                        <tfoot>
                          <tr style={{ background: 'rgba(0, 0, 0, 0.04)', borderTop: '2px solid rgba(0, 0, 0, 0.10)', fontWeight: 700 }} className="font-bold">
                            <td style={{ color: 'var(--text)', fontWeight: 700 }} className="px-4 py-3.5 text-xs uppercase tracking-wider">
                              YEAR {selectedYear}
                            </td>
                            <td style={{ color: 'var(--text)', fontWeight: 700 }} className="px-4 py-3.5 text-center font-mono text-xs">
                              {annualStats.totalTrades}
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono text-xs" style={{ color: '#22c55e', fontWeight: 700 }}>
                              {annualStats.wins}
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono text-xs" style={{ color: '#ef4444', fontWeight: 700 }}>
                              {annualStats.losses}
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono text-xs" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                              {annualStats.winRate.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-sm" style={{ color: annualStats.totalPnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                              {formatINR(annualStats.totalPnl)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-xs" style={{ color: annualStats.avgR >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                              {annualStats.avgR >= 0 ? '+' : ''}{annualStats.avgR.toFixed(2)}R
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono text-xs" style={{ color: annualStats.profitFactor >= 1.0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                              {annualStats.profitFactor === 999 ? '∞' : annualStats.profitFactor.toFixed(2)}
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono text-xs" style={{ color: annualScores.avgOverall >= 70 ? '#22c55e' : annualScores.avgOverall >= 50 ? 'var(--accent)' : '#ef4444', fontWeight: 700 }}>
                              {annualScores.avgOverall.toFixed(0)}%
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
                                {/* SECTION 4: INSIGHTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CARD A — BEST MONTH */}
                  <div
                    style={{
                      background: 'var(--card)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '12px'
                    }}
                    className="p-4 flex flex-col justify-between min-h-[140px]"
                  >
                    <div className="flex items-start justify-between">
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="font-sans leading-none">
                        Best Month
                      </span>
                      <TrendingUp className="w-5 h-5 text-green-500 shrink-0" />
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-black text-green-600 font-display">
                        {bestMonth?.month || '—'}
                      </div>
                      <div className="text-[13px] text-green-600 font-mono font-bold mt-0.5">
                        {bestMonth ? formatINR(bestMonth.stats?.totalPnl || 0) : ''}
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-sub)' }} className="text-[11px] leading-none mt-2 font-mono">
                      {bestMonth?.stats?.totalTrades || 0} trades | {bestMonth?.stats?.winRate.toFixed(0) || 0}% win rate
                    </div>
                  </div>

                  {/* CARD B — WORST MONTH */}
                  <div
                    style={{
                      background: 'var(--card)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '12px'
                    }}
                    className="p-4 flex flex-col justify-between min-h-[140px]"
                  >
                    <div className="flex items-start justify-between">
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="font-sans leading-none">
                        Worst Month
                      </span>
                      <TrendingDown className="w-5 h-5 text-red-500 shrink-0" />
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-black text-red-500 font-display">
                        {worstMonth?.month || '—'}
                      </div>
                      <div className="text-[13px] text-red-500 font-mono font-bold mt-0.5">
                        {worstMonth ? `(${formatINR(Math.abs(worstMonth.stats?.totalPnl || 0))})` : ''}
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-sub)' }} className="text-[11px] leading-none mt-2 font-mono">
                      {worstMonth?.stats?.totalTrades || 0} trades | {worstMonth?.stats?.winRate.toFixed(0) || 0}% win rate
                    </div>
                  </div>

                  {/* CARD C — BEST SETUP */}
                  <div
                    style={{
                      background: 'var(--card)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '12px'
                    }}
                    className="p-4 flex flex-col justify-between min-h-[140px]"
                  >
                    <div className="flex items-start justify-between">
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="font-sans leading-none">
                        Best Setup of Year
                      </span>
                      <Target className="w-5 h-5 text-indigo-500 shrink-0" />
                    </div>
                    <div className="mt-3 overflow-hidden">
                      <div style={{ color: 'var(--text)' }} className="text-lg font-extrabold truncate pr-1" title={bestSetup?.name || '—'}>
                        {bestSetup?.name || '—'}
                      </div>
                      <div className="text-[13px] text-green-600 font-semibold font-mono mt-0.5">
                        {bestSetup ? formatINR(bestSetup.pnl) : ''}
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-sub)' }} className="text-[11px] leading-none mt-2 font-mono">
                      {bestSetup?.tradeCount || 0} trades | {bestSetup?.winRate.toFixed(0) || 0}% win rate
                    </div>
                  </div>

                  {/* CARD D — MOST REPEATED MISTAKE */}
                  <div
                    style={{
                      background: 'var(--card)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '12px'
                    }}
                    className="p-4 flex flex-col justify-between min-h-[140px]"
                  >
                    <div className="flex items-start justify-between">
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="font-sans leading-none">
                        Top Repeated Mistake
                      </span>
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    </div>
                    <div className="mt-3">
                      <div style={{ color: 'var(--text)' }} className="text-xs font-bold leading-snug break-words line-clamp-2" title={topMistakeEntry ? topMistakeEntry[0] : 'None ✓'}>
                        {topMistakeEntry ? topMistakeEntry[0] : 'None ✓'}
                      </div>
                      <div className="text-[11px] mt-1 font-mono">
                        {topMistakeEntry ? (
                          <span className="text-amber-500 font-bold">{topMistakeEntry[1]} times this year</span>
                        ) : (
                          <span style={{ color: '#22c55e' }} className="font-bold">Great discipline! No repeated mistakes!</span>
                        )}
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-sub)' }} className="text-[11px] leading-none mt-2 font-mono">
                      Audit checklist compliance
                    </div>
                  </div>
                </div>

                {/* SECTION 5: ANNUAL COMPLIANCE SCORES + SETUP PERFORMANCE DETAILS */}
                <div
                  style={{
                    background: 'var(--card)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '12px'
                  }}
                  className="p-5"
                >
                  <div style={{ borderColor: 'var(--border)' }} className="border-b pb-3 mb-4">
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }} className="tracking-tight">
                      Annual Trading Scores & Setup Performance
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-sub)' }} className="mt-1">
                      Average across all {annualStats.totalTrades} trades this year
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mt-4">
                    
                    {/* LEFT COMPONENT SCORE BARS */}
                    <div className="space-y-4">
                      {/* Overall Compliance */}
                      <div style={{ borderColor: 'var(--border)' }} className="flex justify-between items-end border-b pb-2">
                        <span style={{ color: 'var(--text)' }} className="text-sm font-semibold">Yearly Average Score</span>
                        <span className={`text-xl font-black font-mono ${getScoreColor(annualScores.avgOverall)}`}>
                          {annualScores.avgOverall.toFixed(0)}%
                        </span>
                      </div>

                      {/* Technical adherence */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-muted)' }} className="font-medium">Technical Setup Score</span>
                          <span className={`font-bold font-mono ${getScoreColor(annualScores.avgTech)}`}>
                            {annualScores.avgTech.toFixed(0)}%
                          </span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }} className="w-full h-2.5 rounded-full border overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{ width: `${annualScores.avgTech}%`, backgroundColor: 'var(--accent)' }}
                          />
                        </div>
                      </div>

                      {/* Psychology rating */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-muted)' }} className="font-medium">Psychological Control</span>
                          <span className={`font-bold font-mono ${getScoreColor(annualScores.avgPsych)}`}>
                            {annualScores.avgPsych.toFixed(0)}%
                          </span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }} className="w-full h-2.5 rounded-full border overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{ width: `${annualScores.avgPsych}%`, backgroundColor: 'var(--accent)' }}
                          />
                        </div>
                      </div>

                      {/* Risk Management rating */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-muted)' }} className="font-medium">Risk Mgmt Discipline</span>
                          <span className={`font-bold font-mono ${getScoreColor(annualScores.avgRisk)}`}>
                            {annualScores.avgRisk.toFixed(0)}%
                          </span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }} className="w-full h-2.5 rounded-full border overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{ width: `${annualScores.avgRisk}%`, backgroundColor: 'var(--accent)' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* RIGHT SETUP PERFORMANCE BREAKDOWN */}
                    <div className="space-y-3">
                      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }} className="tracking-tight">
                        Setup Performance Breakdown
                      </h3>

                      <div
                        style={{
                          background: 'var(--card)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '12px',
                          overflow: 'hidden'
                        }}
                        className="overflow-x-auto text-xs"
                      >
                        <table className="w-full text-left">
                          <thead>
                            <tr style={{ background: 'rgba(0, 0, 0, 0.04)', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                              <th className="px-4 py-2.5 font-sans" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Setup Name</th>
                              <th className="px-3 py-2.5 text-center font-sans" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Trades</th>
                              <th className="px-3 py-2.5 text-center font-sans" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Win Rate</th>
                              <th className="px-4 py-2.5 text-right font-sans" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>P&L</th>
                            </tr>
                          </thead>
                          <tbody>
                            {setupList.map((setupItem, sIdx) => (
                              <tr
                                key={setupItem.name}
                                style={{
                                  background: sIdx % 2 === 1 ? 'rgba(0, 0, 0, 0.018)' : 'transparent',
                                  borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                                  borderTop: sIdx === 0 ? '1px solid rgba(0, 0, 0, 0.06)' : undefined,
                                }}
                                className="border-b transition-colors hover:bg-[rgba(0, 0, 0, 0.03)] cursor-pointer"
                              >
                                <td style={{ color: 'var(--text)', fontSize: '12px', fontWeight: 500 }} className="px-4 py-2.5">
                                  {setupItem.name}
                                </td>
                                <td style={{ color: 'var(--text-sub)' }} className="px-3 py-2.5 text-center font-mono text-xs">
                                  {setupItem.tradeCount}
                                </td>
                                <td
                                  style={{ color: 'var(--accent)', fontWeight: 600 }}
                                  className="px-3 py-2.5 text-center font-mono text-xs"
                                >
                                  {setupItem.winRate.toFixed(0)}%
                                </td>
                                <td
                                  style={{ 
                                    color: setupItem.pnl >= 0 ? '#22c55e' : '#ef4444', 
                                    fontWeight: 600 
                                  }}
                                  className="px-4 py-2.5 text-right font-mono text-xs"
                                >
                                  {formatINR(setupItem.pnl)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
