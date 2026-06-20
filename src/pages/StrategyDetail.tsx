import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import {
  Menu,
  ChevronRight,
  TrendingUp,
  Pencil,
  FileText,
  Calendar,
  Layers,
  ChevronLeft,
  X,
  Plus
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface StrategyDetailItem {
  id: string;
  name: string;
  type_of_strategy: string;
  sub_type: string | null;
  status: string;
  notes: string | null;
  reference_images: string[] | null;
}

interface TradeItem {
  id: string;
  date: string;
  symbol: string;
  direction: string;
  option_type: string | null;
  pnl: number | null;
  r_multiple: number | null;
  status: string;
  execution_status: string | null;
  holding_time_mins: number | null;
}

interface RuleItem {
  id: string;
  rule_type: 'entry' | 'exit';
  rule_text: string;
  rule_order: number;
}

interface AdherenceItem {
  id: string;
  rule_id: string;
  trade_id: string;
  followed: boolean;
}

type TabType = 'OVERVIEW' | 'RULES PERFORMANCE' | 'EXECUTED TRADES' | 'MISSED TRADES' | 'NOTES';

export const StrategyDetail: React.FC = () => {
  const { id: strategyId } = useParams<{ id: string }>();
  const { user, userId, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  // Navigation and active view states
  const [strategy, setStrategy] = useState<StrategyDetailItem | null>(null);
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [adherences, setAdherences] = useState<AdherenceItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string>('');
  const [notesText, setNotesText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Executed trades pagination page state
  const [tradePage, setTradePage] = useState<number>(1);
  const tradesPerPage = 25;

  // Retrieve complete context for the strategy
  const fetchStrategyContext = async () => {
    if (!userId || !strategyId) return;
    try {
      setLoading(true);

      const [strategyRes, tradesRes, rulesRes] = await Promise.all([
        supabase
          .from('strategies')
          .select('id, name, type_of_strategy, sub_type, status, notes, reference_images')
          .eq('id', strategyId)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('trades')
          .select('id, date, symbol, direction, option_type, pnl, r_multiple, status, execution_status, holding_time_mins')
          .eq('strategy_id', strategyId)
          .eq('user_id', userId)
          .order('date', { ascending: false }),
        supabase
          .from('strategy_rules')
          .select('id, rule_type, rule_text, rule_order')
          .eq('strategy_id', strategyId)
          .eq('user_id', userId)
          .order('rule_order', { ascending: true })
      ]);

      if (strategyRes.error) throw strategyRes.error;
      if (tradesRes.error) throw tradesRes.error;
      if (rulesRes.error) throw rulesRes.error;

      if (!strategyRes.data) {
        showError('Strategy not found.');
        navigate('/strategies');
        return;
      }

      setStrategy(strategyRes.data as StrategyDetailItem);
      setNotesText(strategyRes.data.notes || '');
      setTrades((tradesRes.data as TradeItem[]) || []);
      
      const loadedRules = (rulesRes.data as RuleItem[]) || [];
      setRules(loadedRules);

      // Fetch rule evaluations
      if (loadedRules.length > 0) {
        const ruleIds = loadedRules.map((r) => r.id);
        const { data: adherData, error: adherError } = await supabase
          .from('trade_rule_adherence')
          .select('id, rule_id, trade_id, followed')
          .in('rule_id', ruleIds)
          .eq('user_id', userId);

        if (adherError) throw adherError;
        setAdherences((adherData as AdherenceItem[]) || []);
      } else {
        setAdherences([]);
      }

    } catch (err: any) {
      console.error('Error fetching strategy context:', err);
      showError(err.message || 'Failed to load strategy details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategyContext();
  }, [strategyId, userId]);

  // Handle Debounced notes autosaving
  useEffect(() => {
    if (!strategy || notesText === (strategy.notes || '')) {
      return;
    }

    setSavingNotes(true);
    setSaveFeedback('Saving...');

    const timer = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('strategies')
          .update({
            notes: notesText,
            updated_at: new Date().toISOString()
          })
          .eq('id', strategy.id)
          .eq('user_id', userId);

        if (error) throw error;
        setSaveFeedback('Saved ✓');
        setSavingNotes(false);
        setStrategy(prev => prev ? { ...prev, notes: notesText } : null);
        
        // Clear saved message after 2.5s
        setTimeout(() => {
          setSaveFeedback('');
        }, 2500);
      } catch (err: any) {
        console.error('Error auto-saving strategy notes:', err);
        setSaveFeedback('Error saving');
        setSavingNotes(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [notesText, strategy, userId]);

  // Format currency helper
  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(absVal);
    return `${isNegative ? '-' : ''}₹ ${formatted}`;
  };

  // Pre-calculate overview statistics
  const overviewStats = useMemo(() => {
    const totalTrades = trades.length;
    const wins = trades.filter((t) => t.status === 'Win');
    const losses = trades.filter((t) => t.status === 'Loss');
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    const netPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const sumR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0);
    const avgR = totalTrades > 0 ? sumR / totalTrades : 0;

    const winPnlSum = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const lossPnlSum = losses.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const absLossPnl = Math.abs(lossPnlSum);
    const profitFactor = absLossPnl > 0 ? (winPnlSum / absLossPnl) : (winPnlSum > 0 ? 'N/A' : 1.00);

    // Expectancy
    const winRateFrac = totalTrades > 0 ? wins.length / totalTrades : 0;
    const lossRateFrac = totalTrades > 0 ? losses.length / totalTrades : 0;
    const avgWin = wins.length > 0 ? winPnlSum / wins.length : 0;
    const avgLoss = losses.length > 0 ? lossPnlSum / losses.length : 0;
    const expectancy = (winRateFrac * avgWin) + (lossRateFrac * avgLoss);

    return {
      netPnl,
      totalTrades,
      winRate,
      profitFactor,
      avgR,
      expectancy,
      avgWinner: avgWin,
      avgLoser: avgLoss
    };
  }, [trades]);

  // Chart Data preparation
  const chartDetails = useMemo(() => {
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cumulative = 0;
    const list = [{ dateLabel: 'Start', cumPnl: 0 }];

    sorted.forEach((t) => {
      cumulative += (t.pnl || 0);
      list.push({
        dateLabel: t.date,
        cumPnl: cumulative
      });
    });

    const values = list.map((item) => item.cumPnl);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 0);
    const range = maxVal - minVal;
    const zeroPercent = range > 0 ? (maxVal / range) * 100 : 0;

    return {
      data: list,
      zeroPercent
    };
  }, [trades]);

  // Rule evaluations mapping
  const rulePerformance = useMemo(() => {
    const stats: Record<string, {
      id: string;
      rule_text: string;
      rule_type: 'entry' | 'exit';
      followRate: number | null;
      pnlFollowed: number | null;
      pnlNotFollowed: number | null;
      winRateFollowed: number | null;
      evaluationCount: number;
    }> = {};

    rules.forEach((rule) => {
      const evaluations = adherences.filter((ad) => ad.rule_id === rule.id);
      const totalCount = evaluations.length;

      if (totalCount === 0) {
        stats[rule.id] = {
          id: rule.id,
          rule_text: rule.rule_text,
          rule_type: rule.rule_type,
          followRate: null,
          pnlFollowed: null,
          pnlNotFollowed: null,
          winRateFollowed: null,
          evaluationCount: 0
        };
        return;
      }

      const followedAds = evaluations.filter((ad) => ad.followed === true);
      const notFollowedAds = evaluations.filter((ad) => ad.followed === false);

      const followedCount = followedAds.length;
      const followRate = (followedCount / totalCount) * 100;

      // Map to pnl and status
      const followedTrades = followedAds.map((ad) => trades.find((t) => t.id === ad.trade_id)).filter((t): t is TradeItem => t !== undefined);
      const notFollowedTrades = notFollowedAds.map((ad) => trades.find((t) => t.id === ad.trade_id)).filter((t): t is TradeItem => t !== undefined);

      const pnlFollowed = followedTrades.length > 0
        ? followedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / followedTrades.length
        : null;

      const pnlNotFollowed = notFollowedTrades.length > 0
        ? notFollowedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / notFollowedTrades.length
        : null;

      const winsFollowed = followedTrades.filter((t) => t.status === 'Win').length;
      const winRateFollowed = followedTrades.length > 0
        ? (winsFollowed / followedTrades.length) * 100
        : null;

      stats[rule.id] = {
        id: rule.id,
        rule_text: rule.rule_text,
        rule_type: rule.rule_type,
        followRate,
        pnlFollowed,
        pnlNotFollowed,
        winRateFollowed,
        evaluationCount: totalCount
      };
    });

    return Object.values(stats);
  }, [rules, adherences, trades]);

  const entryRulesPerf = useMemo(() => rulePerformance.filter((r) => r.rule_type === 'entry'), [rulePerformance]);
  const exitRulesPerf = useMemo(() => rulePerformance.filter((r) => r.rule_type === 'exit'), [rulePerformance]);

  // Paginated executed trades
  const paginatedTrades = useMemo(() => {
    const startIndex = (tradePage - 1) * tradesPerPage;
    return trades.slice(startIndex, startIndex + tradesPerPage);
  }, [trades, tradePage]);

  const totalTradePages = Math.ceil(trades.length / tradesPerPage) || 1;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center animate-pulse" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 border-t-cyan-500 border-zinc-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT WORKSPACE */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
        {/* MOBILE HEADER */}
        <header
          className="flex items-center justify-between px-6 py-4 md:hidden sticky top-0 z-20"
          style={{ backgroundColor: 'var(--topbar)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="text-xl font-bold tracking-wider font-display" style={{ color: 'var(--accent)' }}>TRADELYZE</div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg cursor-pointer text-zinc-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            {/* BREADCRUMB ROW */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 font-mono mb-4 uppercase tracking-wider font-semibold">
              <Link to="/strategies" className="hover:text-cyan-400 transition-colors">Strategies</Link>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
              <span className="text-zinc-400">{strategy ? strategy.name : 'Loading...'}</span>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
              <span className="text-cyan-400">{activeTab}</span>
            </div>

            {/* STRATEGY HEADER BLOCK */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
                    {strategy ? strategy.name : 'Strategy details'}
                  </h1>
                  {strategy && (
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shrink-0">
                      {strategy.type_of_strategy}
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 text-xs font-mono mt-1">
                  ID: {strategyId} · STATUS: <span className="text-zinc-300 font-bold uppercase">{strategy?.status || 'active'}</span>
                </p>
              </div>

              <div>
                <Link
                  to={`/strategies/${strategyId}/edit`}
                  className="inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '0.5px solid var(--border)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card-hover)';
                    e.currentTarget.style.borderColor = 'var(--border-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit Setup</span>
                </Link>
              </div>
            </div>

            {/* TAB SELECTORS ACTIONS */}
            <div className="flex border-b overflow-x-auto gap-1 sticky top-0 z-10 scrollbar-none mb-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
              {(['OVERVIEW', 'RULES PERFORMANCE', 'EXECUTED TRADES', 'MISSED TRADES', 'NOTES'] as TabType[]).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border-b-2 shrink-0 ${
                      active
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-800'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* TAB RENDERS */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-t-cyan-500 border-zinc-700 animate-spin"></div>
                <p className="text-xs text-zinc-500 font-mono">Loading setup statistics...</p>
              </div>
            ) : (
              <>
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'OVERVIEW' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* STATS MATRIX */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* CARD 1 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-500">Net P&L</span>
                        <div className={`text-2xl font-extrabold font-mono mt-1.5 ${overviewStats.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(overviewStats.netPnl)}
                        </div>
                      </div>

                      {/* CARD 2 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-500">Total Trades</span>
                        <div className="text-2xl font-extrabold font-mono mt-1.5 text-zinc-100">
                          {overviewStats.totalTrades}
                        </div>
                      </div>

                      {/* CARD 3 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-500">Win Rate</span>
                        <div className={`text-2xl font-extrabold font-mono mt-1.5 ${
                          overviewStats.winRate >= 60 ? 'text-emerald-400' : overviewStats.winRate >= 40 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {overviewStats.winRate.toFixed(1)}%
                        </div>
                      </div>

                      {/* CARD 4 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-500">Profit Factor</span>
                        <div className="text-2xl font-extrabold font-mono mt-1.5 text-zinc-200">
                          {typeof overviewStats.profitFactor === 'number' ? overviewStats.profitFactor.toFixed(2) : overviewStats.profitFactor}
                        </div>
                      </div>

                      {/* CARD 5 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-500">Avg R-Multiple</span>
                        <div className={`text-2xl font-extrabold font-mono mt-1.5 ${overviewStats.avgR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {overviewStats.avgR >= 0 ? '+' : ''}{overviewStats.avgR.toFixed(2)}R
                        </div>
                      </div>

                      {/* CARD 6 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-500">Expectancy</span>
                        <div className={`text-2xl font-extrabold font-mono mt-1.5 ${overviewStats.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(overviewStats.expectancy)}
                        </div>
                      </div>

                      {/* CARD 7 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-500">Avg Winner</span>
                        <div className="text-2xl font-extrabold font-mono mt-1.5 text-emerald-400">
                          {formatCurrency(overviewStats.avgWinner)}
                        </div>
                      </div>

                      {/* CARD 8 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-500">Avg Loser</span>
                        <div className="text-2xl font-extrabold font-mono mt-1.5 text-red-400">
                          {formatCurrency(overviewStats.avgLoser)}
                        </div>
                      </div>
                    </div>

                    {/* CHARTS GRAPH COMPONENT */}
                    <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                      <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-5">
                        Cumulative P&L — {strategy?.name || 'Strategy'}
                      </h3>

                      {chartDetails.data.length <= 1 ? (
                        <div className="h-[260px] flex flex-col items-center justify-center text-center text-zinc-500 text-xs font-mono">
                          <TrendingUp className="w-8 h-8 text-zinc-600 mb-2" />
                          No trades logged with this strategy to compute curve.
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: 260 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={chartDetails.data}
                              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                            >
                              <defs>
                                <linearGradient id="stratAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                                  <stop offset={`${chartDetails.zeroPercent}%`} stopColor="#22c55e" stopOpacity={0.05} />
                                  <stop offset={`${chartDetails.zeroPercent}%`} stopColor="#ef4444" stopOpacity={0.05} />
                                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.15} />
                                </linearGradient>
                                <linearGradient id="stratLineGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                                  <stop offset={`${chartDetails.zeroPercent}%`} stopColor="#22c55e" stopOpacity={1} />
                                  <stop offset={`${chartDetails.zeroPercent}%`} stopColor="#ef4444" stopOpacity={1} />
                                  <stop offset="100%" stopColor="#ef4444" stopOpacity={1} />
                                </linearGradient>
                              </defs>

                              <XAxis
                                dataKey="dateLabel"
                                tick={{ fontSize: 10, fill: '#8a8b9c' }}
                                tickLine={false}
                                axisLine={{ stroke: 'var(--border)' }}
                              />
                              <YAxis
                                tick={{ fontSize: 10, fill: '#8a8b9c' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`}
                                width={85}
                              />
                              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: '#1E1F29',
                                  border: '0.5px solid var(--border)',
                                  borderRadius: '12px',
                                  color: '#ffffff'
                                }}
                                formatter={(value: any) => [
                                  <span key="val" className={Number(value) >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                    {formatCurrency(Number(value))}
                                  </span>,
                                  'Cumulative P&L'
                                ]}
                              />
                              <Area
                                type="monotone"
                                dataKey="cumPnl"
                                stroke="url(#stratLineGrad)"
                                strokeWidth={2}
                                fill="url(#stratAreaGrad)"
                                dot={(props: any) => {
                                  const { cx, cy, payload } = props;
                                  const val = payload?.cumPnl ?? 0;
                                  return (
                                    <circle
                                      key={`dot-${cx}-${cy}`}
                                      cx={cx}
                                      cy={cy}
                                      r={3}
                                      fill={val >= 0 ? '#10b981' : '#ef4444'}
                                      strokeWidth={0}
                                    />
                                  );
                                }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: RULES PERFORMANCE */}
                {activeTab === 'RULES PERFORMANCE' && (
                  <div className="space-y-8 animate-fade-in">
                    {/* ENTRY RULES SELECTION */}
                    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bar)' }}>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <span className="w-1.5 h-3 bg-cyan-400 rounded-sm" />
                          Entry Rules Performance
                        </h4>
                        <span className="text-xs font-mono text-zinc-500 font-bold">{entryRulesPerf.length} active rules</span>
                      </div>

                      {entryRulesPerf.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                          No entry rules specified for this strategy.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="border-b text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500" style={{ borderColor: 'var(--border)' }}>
                                <th className="py-2.5 px-4">Rule Text</th>
                                <th className="py-2.5 px-4 text-center">Follow Rate</th>
                                <th className="py-2.5 px-4 text-right">P&L Followed</th>
                                <th className="py-2.5 px-4 text-right">P&L Not Followed</th>
                                <th className="py-2.5 px-4 text-center">Win Rate Followed</th>
                                <th className="py-2.5 px-4 text-center">Evaluated Trades</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entryRulesPerf.map((r) => {
                                let followColor = 'text-red-400';
                                if (r.followRate !== null) {
                                  if (r.followRate >= 80) followColor = 'text-emerald-400';
                                  else if (r.followRate >= 50) followColor = 'text-amber-400';
                                }

                                return (
                                  <tr key={r.id} className="border-b hover:bg-zinc-800/10 transition-colors" style={{ borderColor: 'var(--border)' }}>
                                    <td className="py-3 px-4 text-sm text-zinc-200 font-semibold">{r.rule_text}</td>
                                    <td className={`py-3 px-4 text-center text-xs font-mono font-bold ${followColor}`}>
                                      {r.followRate !== null ? `${r.followRate.toFixed(1)}%` : '--'}
                                    </td>
                                    <td className={`py-3 px-4 text-right text-xs font-mono font-bold ${r.pnlFollowed !== null && r.pnlFollowed >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {r.pnlFollowed !== null ? formatCurrency(r.pnlFollowed) : '--'}
                                    </td>
                                    <td className={`py-3 px-4 text-right text-xs font-mono font-bold ${r.pnlNotFollowed !== null && r.pnlNotFollowed >= 0 ? 'text-emerald-200' : 'text-red-300'}`}>
                                      {r.pnlNotFollowed !== null ? formatCurrency(r.pnlNotFollowed) : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-center text-xs font-mono text-cyan-400 font-bold">
                                      {r.winRateFollowed !== null ? `${r.winRateFollowed.toFixed(1)}%` : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-center text-xs font-mono text-zinc-400">{r.evaluationCount}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* EXIT RULES SELECTION */}
                    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bar)' }}>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <span className="w-1.5 h-3 bg-indigo-400 rounded-sm" />
                          Exit Rules Performance
                        </h4>
                        <span className="text-xs font-mono text-zinc-500 font-bold">{exitRulesPerf.length} active rules</span>
                      </div>

                      {exitRulesPerf.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                          No exit rules specified for this strategy.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="border-b text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500" style={{ borderColor: 'var(--border)' }}>
                                <th className="py-2.5 px-4">Rule Text</th>
                                <th className="py-2.5 px-4 text-center">Follow Rate</th>
                                <th className="py-2.5 px-4 text-right">P&L Followed</th>
                                <th className="py-2.5 px-4 text-right">P&L Not Followed</th>
                                <th className="py-2.5 px-4 text-center">Win Rate Followed</th>
                                <th className="py-2.5 px-4 text-center">Evaluated Trades</th>
                              </tr>
                            </thead>
                            <tbody>
                              {exitRulesPerf.map((r) => {
                                let followColor = 'text-red-400';
                                if (r.followRate !== null) {
                                  if (r.followRate >= 80) followColor = 'text-emerald-400';
                                  else if (r.followRate >= 50) followColor = 'text-amber-400';
                                }

                                return (
                                  <tr key={r.id} className="border-b hover:bg-zinc-800/10 transition-colors" style={{ borderColor: 'var(--border)' }}>
                                    <td className="py-3 px-4 text-sm text-zinc-200 font-semibold">{r.rule_text}</td>
                                    <td className={`py-3 px-4 text-center text-xs font-mono font-bold ${followColor}`}>
                                      {r.followRate !== null ? `${r.followRate.toFixed(1)}%` : '--'}
                                    </td>
                                    <td className={`py-3 px-4 text-right text-xs font-mono font-bold ${r.pnlFollowed !== null && r.pnlFollowed >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {r.pnlFollowed !== null ? formatCurrency(r.pnlFollowed) : '--'}
                                    </td>
                                    <td className={`py-3 px-4 text-right text-xs font-mono font-bold ${r.pnlNotFollowed !== null && r.pnlNotFollowed >= 0 ? 'text-emerald-200' : 'text-red-300'}`}>
                                      {r.pnlNotFollowed !== null ? formatCurrency(r.pnlNotFollowed) : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-center text-xs font-mono text-cyan-400 font-bold">
                                      {r.winRateFollowed !== null ? `${r.winRateFollowed.toFixed(1)}%` : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-center text-xs font-mono text-zinc-400">{r.evaluationCount}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: EXECUTED TRADES */}
                {activeTab === 'EXECUTED TRADES' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                      {trades.length === 0 ? (
                        <div className="p-12 text-center text-xs text-zinc-500 font-mono">
                          No trades logged with this setup yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto animate-fade-in_short">
                          <table className="w-full text-left border-collapse min-w-[750px]">
                            <thead>
                              <tr className="border-b text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500" style={{ borderColor: 'var(--border)' }}>
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4">Symbol</th>
                                <th className="py-3 px-4">Direction</th>
                                <th className="py-3 px-4 text-right">Net P&L</th>
                                <th className="py-3 px-4 text-center">R-Multiple</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4">Execution</th>
                                <th className="py-3 px-4">Hold Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedTrades.map((t) => {
                                const dirOpt = t.direction + (t.option_type ? ' ' + t.option_type : '');
                                return (
                                  <tr
                                    key={t.id}
                                    className="border-b hover:bg-zinc-800/10 cursor-pointer transition-colors"
                                    style={{ borderColor: 'var(--border)' }}
                                    onClick={() => navigate(`/trade/${t.id}`)}
                                  >
                                    <td className="py-3.5 px-4 text-xs font-mono text-zinc-300">{t.date}</td>
                                    <td className="py-3.5 px-4 font-bold text-zinc-100 text-sm tracking-tight">{t.symbol}</td>
                                    <td className="py-3.5 px-4">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        t.direction.toUpperCase() === 'LONG' || t.direction.toUpperCase() === 'BUY'
                                          ? 'bg-emerald-500/10 text-emerald-400'
                                          : 'bg-rose-500/10 text-rose-400'
                                      }`}>
                                        {dirOpt}
                                      </span>
                                    </td>
                                    <td className={`py-3.5 px-4 text-right text-xs font-mono font-bold ${t.pnl && t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {t.pnl !== null ? formatCurrency(t.pnl) : '₹0'}
                                    </td>
                                    <td className={`py-3.5 px-4 text-center text-xs font-mono font-bold ${t.r_multiple && t.r_multiple >= 0 ? 'text-emerald-400' : 'text-red-450'}`}>
                                      {t.r_multiple !== null ? `${t.r_multiple >= 0 ? '+' : ''}${t.r_multiple.toFixed(2)}R` : '--'}
                                    </td>
                                    <td className="py-3.5 px-4 text-center text-xs">
                                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                        t.status === 'Win' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-550/20' :
                                        t.status === 'Loss' ? 'bg-rose-500/10 text-rose-400 border border-rose-550/20' :
                                        'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                                      }`}>
                                        {t.status}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-xs font-semibold text-zinc-300 capitalize">{t.execution_status || '--'}</td>
                                    <td className="py-3.5 px-4 text-xs font-mono text-zinc-400">{t.holding_time_mins ? `${t.holding_time_mins} mins` : '--'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* PAGINATION ROW CONTROLLER */}
                    {totalTradePages > 1 && (
                      <div className="flex items-center justify-between border-t border-[#2c2d3c] pt-4 px-1">
                        <button
                          disabled={tradePage === 1}
                          onClick={() => setTradePage(prev => Math.max(prev - 1, 1))}
                          className="px-3.5 py-1.5 text-xs font-bold uppercase rounded-lg border border-[#2c2d3c] hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors inline-flex items-center gap-1 text-zinc-300"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Prev
                        </button>

                        <span className="text-zinc-500 text-xs font-mono">
                          Page <strong className="text-zinc-300">{tradePage}</strong> of <strong className="text-zinc-300">{totalTradePages}</strong>
                        </span>

                        <button
                          disabled={tradePage === totalTradePages}
                          onClick={() => setTradePage(prev => Math.min(prev + 1, totalTradePages))}
                          className="px-3.5 py-1.5 text-xs font-bold uppercase rounded-lg border border-[#2c2d3c] hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors inline-flex items-center gap-1 text-zinc-300"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: MISSED TRADES */}
                {activeTab === 'MISSED TRADES' && (
                  <div className="p-12 text-center rounded-2xl border text-xs font-mono text-zinc-500 leading-relaxed capitalize tracking-wide animate-fade-in" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                    Coming soon — Missed Trades tracking will be added in the next update.
                  </div>
                )}

                {/* TAB 5: NOTES */}
                {activeTab === 'NOTES' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between mb-3.5">
                        <label htmlFor="strategy-notes-area" className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          Strategy Notes
                        </label>
                        {saveFeedback && (
                          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                            saveFeedback.includes('Saved') ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                          }`}>
                            {saveFeedback}
                          </span>
                        )}
                      </div>

                      <textarea
                        id="strategy-notes-area"
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Write down details for your playbook setup, entry rules logic, core signals, checklist rules..."
                        rows={10}
                        className="w-full bg-[#13141F] rounded-xl border border-zinc-800 text-zinc-100 p-4 font-sans text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-zinc-600 leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
export default StrategyDetail;
