import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import {
  Menu,
  FileText,
  Calendar,
  Activity,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import {
  calcTradeStats,
  calcDayGroups,
  calcStreaks,
  calcScoreAverages,
  MONTH_NAMES,
  scoreColor,
  pnlColor,
  formatINR,
  formatINRShort,
  formatPositiveINR
} from '../lib/calculations';

export const TradingReportsPage: React.FC = () => {
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

  // Fetch Session Data
  useEffect(() => {
    if (!userId) return;

    const fetchReportContext = async () => {
      try {
        setLoading(true);

        const { data: tradesData, error: tradesError } = await supabase
          .from('trades')
          .select('*, strategies(name, type_of_strategy)')
          .eq('user_id', userId)
          .eq('month', selectedMonth)
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
        console.error('Report syncing error:', err);
        showError(err.message || 'Failed to fetch trading metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportContext();
  }, [userId, selectedMonth, selectedYear, showError]);

  // Calculations
  const calculatedContext = useMemo(() => {
    const stats = calcTradeStats(trades);
    const dayGroups = calcDayGroups(trades);
    const streaks = calcStreaks(dayGroups);
    const tradeIds = trades.map((t: any) => t.id);
    const scores = calcScoreAverages(tradeIds, psychologyData, riskData, rulesData);

    const winDays = dayGroups.filter(d => d.pnl > 0).length;
    const lossDays = dayGroups.filter(d => d.pnl < 0).length;
    const largestProfitDay = dayGroups.length > 0 ? Math.max(...dayGroups.map(d => d.pnl)) : 0;
    const largestLossDay = dayGroups.length > 0 ? Math.abs(Math.min(...dayGroups.map(d => d.pnl))) : 0;

    // Mistakes processing
    const mistakeMap: Record<string, number> = {
      Technical: 0,
      Psychological: 0,
      'Risk Management': 0,
      'No Mistake': 0
    };
    trades.forEach(t => {
      if (t.mistake_type && t.mistake_type in mistakeMap) {
        mistakeMap[t.mistake_type]++;
      }
    });

    const topMistakesMap: Record<string, number> = {};
    trades.filter(t => t.mistake_text).forEach(t => {
      topMistakesMap[t.mistake_text] = (topMistakesMap[t.mistake_text] || 0) + 1;
    });

    const topMistakesList = Object.entries(topMistakesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      stats,
      dayGroups,
      streaks,
      scores,
      winDays,
      lossDays,
      largestProfitDay,
      largestLossDay,
      mistakeMap,
      topMistakesList
    };
  }, [trades, psychologyData, riskData, rulesData]);

  const {
    stats,
    dayGroups,
    streaks,
    scores,
    winDays,
    lossDays,
    largestProfitDay,
    largestLossDay,
    mistakeMap,
    topMistakesList
  } = calculatedContext;

  // Custom visual aids for score meters
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
    <div className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-indigo-500/30" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user?.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT SIDE MAIN CONTAINER */}
      <div className="flex-1 md:pl-[250px] flex flex-col min-h-screen">
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
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 font-display">
                  Trading Reports
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Day-by-day breakdown. All calculations from your trade data.
                </p>
              </div>

              {/* MONTH/YEAR SELECTORS */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-500" />
                
                {/* MONTH SELECT */}
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

                {/* YEAR SELECT */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                  className="rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all font-medium font-mono"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-b mt-5 mb-6" style={{ borderColor: 'var(--border)' }} />

            {/* SKELETON LOADER STATE */}
            {loading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 rounded-xl h-[380px] skeleton" />
                  <div className="lg:col-span-1 space-y-4">
                    <div className="rounded-xl h-[230px] skeleton" />
                    <div className="rounded-xl h-[150px] skeleton" />
                  </div>
                </div>
              </div>
            ) : trades.length === 0 ? (
              /* EMPTY REPORT STATE */
              <div className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                  <FileText className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold tracking-tight font-display" style={{ color: 'var(--text)' }}>
                  No trades in {selectedMonth} {selectedYear}
                </h3>
                <p className="text-xs mt-1.5 max-w-sm" style={{ color: 'var(--text-sub)' }}>
                  Log trades to view daily breakdowns, compliance scores, streaks audit, and mistake indexes.
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
              /* ACTIVE REPORT CONTENT */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                
                {/* LEFT: DAY-BY-DAY TABLE COLUMN */}
                <div className="lg:col-span-2 p-5 overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                      Daily Breakdown — {selectedMonth} {selectedYear}
                    </h2>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-sub)' }}>
                      {dayGroups.length} trading days | {trades.length} total trades
                    </p>
                  </div>

                  {/* TABLE VIEW WRAPPER */}
                  <div className="overflow-x-auto mt-5 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bar)' }} className="text-[11.5px] font-bold text-zinc-500 uppercase tracking-wider border-b">
                          <th className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>Date</th>
                          <th className="px-3 py-3 text-center" style={{ color: 'var(--text-muted)' }}>Trades</th>
                          <th className="px-3 py-3" style={{ color: 'var(--text-muted)' }}>Symbols</th>
                          <th className="px-3 py-3" style={{ color: 'var(--text-muted)' }}>Setups</th>
                          <th className="px-3 py-3 text-center" style={{ color: 'var(--text-muted)' }}>W/L/BE</th>
                          <th className="px-4 py-3 text-right" style={{ color: 'var(--text-muted)' }}>P&L (Day)</th>
                          <th className="px-4 py-3 text-right" style={{ color: 'var(--text-muted)' }}>Cumulative</th>
                          <th className="px-4 py-3 text-center" style={{ color: 'var(--text-muted)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayGroups.map((row) => {
                          const formattedDate = new Date(row.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          });

                          return (
                            <tr
                              key={row.date}
                              style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
                              className="border-b transition-colors hover:bg-[var(--row)]"
                            >
                              {/* Date Column */}
                              <td className="px-4 py-3 font-semibold text-xs whitespace-nowrap" style={{ color: 'var(--text)' }}>
                                {formattedDate}
                              </td>

                              {/* Trades Count */}
                              <td className="px-3 py-3 text-center font-mono" style={{ color: 'var(--text)' }}>
                                {row.tradeCount}
                              </td>

                              {/* Symbols */}
                              <td className="px-3 py-3 font-mono text-xs max-w-[100px] truncate" style={{ color: 'var(--text)' }} title={row.symbols}>
                                {row.symbols || '—'}
                              </td>

                              {/* Setups */}
                              <td className="px-3 py-3 text-xs max-w-[120px] truncate" style={{ color: 'var(--text-sub)' }} title={row.setups}>
                                {row.setups || '—'}
                              </td>

                              {/* W/L/BE Badges */}
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold">
                                  {row.wins > 0 && (
                                    <span className="text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 font-mono">
                                      {row.wins}W
                                    </span>
                                  )}
                                  {row.losses > 0 && (
                                    <span className="text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 font-mono">
                                      {row.losses}L
                                    </span>
                                  )}
                                  {row.breakevens > 0 && (
                                    <span className="text-zinc-500 bg-zinc-500/10 px-1.5 py-0.5 rounded border border-zinc-500/20 font-mono">
                                      {row.breakevens}BE
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* P&L (Day) */}
                              <td className={`px-4 py-3 text-right font-semibold font-mono text-xs whitespace-nowrap ${pnlColor(row.pnl)}`}>
                                {formatINR(row.pnl)}
                              </td>

                              {/* Cumulative */}
                              <td className={`px-4 py-3 text-right font-mono text-xs whitespace-nowrap ${pnlColor(row.cumulativePnl)}`}>
                                {formatINR(row.cumulativePnl)}
                              </td>

                              {/* Status Badge */}
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                {row.dayStatus === 'Win' ? (
                                  <span className="bg-green-500/10 text-green-500 border border-green-500/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                    WIN
                                  </span>
                                ) : row.dayStatus === 'Loss' ? (
                                  <span className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                    LOSS
                                  </span>
                                ) : (
                                  <span className="bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                    BE
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* STATS TOTAL FOOTER */}
                      {stats && (
                        <tfoot>
                          <tr className="font-bold border-t" style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--border)' }}>
                            <td className="px-4 py-3.5 uppercase tracking-wider text-xs" style={{ color: 'var(--text)', fontWeight: 600 }}>
                              TOTAL ({selectedMonth})
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono text-xs" style={{ color: 'var(--text)' }}>
                              {stats.totalTrades}
                            </td>
                            <td className="px-3 py-3.5" />
                            <td className="px-3 py-3.5" />
                            <td className="px-3 py-3.5 text-center font-mono">
                              <span className="font-semibold text-xs" style={{ color: 'var(--text-sub)' }}>
                                {stats.wins}W / {stats.losses}L / {stats.breakevens}BE
                              </span>
                            </td>
                            <td className={`px-4 py-3.5 text-right font-mono text-sm ${pnlColor(stats.totalPnl)}`}>
                              {formatINR(stats.totalPnl)}
                            </td>
                            <td className={`px-4 py-3.5 text-right font-mono text-sm ${pnlColor(stats.totalPnl)}`}>
                              {formatINR(stats.totalPnl)}
                            </td>
                            <td className="px-4 py-3.5" />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* RIGHT SIDE STATISTICAL PANELS */}
                <div className="lg:col-span-1 space-y-5 lg:sticky lg:top-4">
                  
                  {/* CARD 1: MONTH SUMMARY PANEL */}
                  {stats && (
                    <div className="shadow-sm p-5" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
                      <h3 className="text-xs font-bold uppercase tracking-widest pb-3 border-b" style={{ color: 'var(--text)', fontWeight: 600, letterSpacing: '0.5px', borderColor: 'var(--border)' }}>
                        {selectedMonth} {selectedYear} Summary
                      </h3>
                      
                      <div className="mt-3 divide-y" style={{ borderColor: 'var(--border)' }}>
                        {/* Net P&L */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Net P&L</span>
                          <span className={`font-bold font-mono`} style={{ color: stats.totalPnl >= 0 ? '#22c55e' : '#ef4444', fontSize: '13px' }}>
                            {formatINR(stats.totalPnl)}
                          </span>
                        </div>

                        {/* Total Trades */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Total Trades</span>
                          <span className="font-mono" style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                            {stats.totalTrades}
                          </span>
                        </div>

                        {/* W / L / BE Counts */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium font-sans" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Win / Loss / BE</span>
                          <span className="font-mono text-xs" style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                            {stats.wins} W / {stats.losses} L / {stats.breakevens} BE
                          </span>
                        </div>

                        {/* Win Rate */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Win Rate</span>
                          <span className="font-mono" style={{ color: stats.winRate >= 50 ? '#22c55e' : '#ef4444', fontSize: '13px', fontWeight: 600 }}>
                            {stats.winRate.toFixed(1)}%
                          </span>
                        </div>

                        {/* Trading Days */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Trading Days</span>
                          <span className="font-mono" style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                            {dayGroups.length} days
                          </span>
                        </div>

                        {/* Win Days */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Win Days</span>
                          <span className="font-mono" style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
                            {winDays} ({dayGroups.length > 0 ? ((winDays / dayGroups.length) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>

                        {/* Loss Days */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Loss Days</span>
                          <span className="font-mono" style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
                            {lossDays}
                          </span>
                        </div>

                        {/* Profit Factor */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Profit Factor</span>
                          <span
                            className="font-mono"
                            style={{ color: stats.profitFactor >= 1.0 ? '#22c55e' : '#ef4444', fontSize: '13px', fontWeight: 600 }}
                          >
                            {stats.profitFactor === 999 ? '∞' : stats.profitFactor.toFixed(2)}
                          </span>
                        </div>

                        {/* Avg R */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium font-sans" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Avg R-Multiple</span>
                          <span className="font-mono" style={{ color: stats.avgR >= 0 ? '#22c55e' : '#ef4444', fontSize: '13px', fontWeight: 600 }}>
                            {stats.avgR >= 0 ? '+' : ''}
                            {stats.avgR.toFixed(2)}R
                          </span>
                        </div>

                        {/* Avg Win */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Avg Win</span>
                          <span className="font-mono" style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
                            {formatPositiveINR(stats.avgWin)}
                          </span>
                        </div>

                        {/* Avg Loss */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Avg Loss</span>
                          <span className="font-mono" style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
                            -{formatPositiveINR(stats.avgLoss)}
                          </span>
                        </div>

                        {/* Avg W/L Ratio */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Avg W:L Ratio</span>
                          <span className="font-mono" style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                            {stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) : '∞'}:1
                          </span>
                        </div>

                        {/* Best Trade */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Best Trade</span>
                          <span className="font-mono" style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
                            {formatPositiveINR(stats.largestWin)}
                          </span>
                        </div>

                        {/* Worst Trade */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Worst Trade</span>
                          <span className="font-mono" style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
                            -{formatPositiveINR(stats.largestLoss)}
                          </span>
                        </div>

                        {/* Best Day Pnl */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Best Day P&L</span>
                          <span className="font-mono" style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
                            {formatPositiveINR(largestProfitDay)}
                          </span>
                        </div>

                        {/* Worst Day Pnl */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Worst Day P&L</span>
                          <span className="font-mono" style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
                            -{formatPositiveINR(largestLossDay)}
                          </span>
                        </div>

                        {/* Max Win Streak */}
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Max Win Streak</span>
                          <span className="font-mono" style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
                            {streaks.maxWinStreak} days
                          </span>
                        </div>

                        {/* Max Loss Streak */}
                        <div className="flex justify-between items-center py-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>Max Loss Streak</span>
                          <span className="font-mono" style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
                            {streaks.maxLossStreak} days
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CARD 2: TRADING COMPLIANCE SCORES */}
                  <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
                    <h3 className="text-sm font-bold uppercase tracking-widest pb-3 border-b" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                      Avg Trade Scores
                    </h3>

                    <div className="space-y-4 mt-4">
                      {/* Overall Compliance */}
                      <div className="flex justify-between items-end border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-sub)' }}>Overall Compliance</span>
                        <span className={`text-xl font-extrabold font-mono ${getScoreColor(scores.avgOverall)}`}>
                          {scores.avgOverall.toFixed(0)}%
                        </span>
                      </div>

                      {/* Technical adherence */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium" style={{ color: 'var(--text-sub)' }}>Technical Setup Score</span>
                          <span className={`font-bold font-mono ${getScoreColor(scores.avgTech)}`}>
                            {scores.avgTech.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden border" style={{ backgroundColor: 'var(--row)', borderColor: 'var(--border)' }}>
                          <div
                            className={`h-full transition-all duration-500 ${getScoreBg(scores.avgTech)}`}
                            style={{ width: `${scores.avgTech}%` }}
                          />
                        </div>
                      </div>

                      {/* Psychology rating */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium" style={{ color: 'var(--text-sub)' }}>Psychological Control</span>
                          <span className={`font-bold font-mono ${getScoreColor(scores.avgPsych)}`}>
                            {scores.avgPsych.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden border" style={{ backgroundColor: 'var(--row)', borderColor: 'var(--border)' }}>
                          <div
                            className={`h-full transition-all duration-500 ${getScoreBg(scores.avgPsych)}`}
                            style={{ width: `${scores.avgPsych}%` }}
                          />
                        </div>
                      </div>

                      {/* Risk Management rating */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium" style={{ color: 'var(--text-sub)' }}>Risk Mgmt Discipline</span>
                          <span className={`font-bold font-mono ${getScoreColor(scores.avgRisk)}`}>
                            {scores.avgRisk.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden border" style={{ backgroundColor: 'var(--row)', borderColor: 'var(--border)' }}>
                          <div
                            className={`h-full transition-all duration-500 ${getScoreBg(scores.avgRisk)}`}
                            style={{ width: `${scores.avgRisk}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: PSYCHOLOGICAL & TECHNICAL MISTAKES */}
                  <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
                    <h3 className="text-sm font-bold uppercase tracking-widest pb-3 border-b" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                      Mistakes This Month
                    </h3>

                    <div className="mt-4 space-y-2.5 text-xs text-zinc-400">
                      <div className="flex justify-between border-b pb-1.5 font-medium" style={{ borderColor: 'var(--border)' }}>
                        <span style={{ color: 'var(--text-sub)' }}>Technical Setup</span>
                        <span className="font-mono text-indigo-500 font-bold">{mistakeMap.Technical}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 font-medium" style={{ borderColor: 'var(--border)' }}>
                        <span style={{ color: 'var(--text-sub)' }}>Psychological Control</span>
                        <span className="font-mono text-purple-500 font-bold">{mistakeMap.Psychological}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 font-medium" style={{ borderColor: 'var(--border)' }}>
                        <span style={{ color: 'var(--text-sub)' }}>Risk Management Breach</span>
                        <span className="font-mono text-amber-500 font-bold">{mistakeMap['Risk Management']}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span style={{ color: 'var(--text-sub)' }}>Flawless Execution</span>
                        <span className="font-mono text-green-500 font-bold">{mistakeMap['No Mistake']}</span>
                      </div>

                      {/* Specific Textual Mistakes Insights */}
                      <div className="border-t pt-3.5 mt-3 space-y-2" style={{ borderColor: 'var(--border)' }}>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          Most Repeated Mistakes
                        </h4>
                        
                        {topMistakesList.length > 0 ? (
                           <div className="space-y-1.5">
                            {topMistakesList.map(([text, count], idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-start gap-1 p-2 rounded-lg font-mono text-[10px] border"
                                style={{ backgroundColor: 'var(--row)', borderColor: 'var(--border)' }}
                              >
                                <span className="leading-tight block break-words max-w-[200px]" style={{ color: 'var(--text-sub)' }}>
                                  {text}
                                </span>
                                <span className="text-red-500 font-bold shrink-0 ml-1">
                                  ×{count}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-green-500 italic">
                            All trades have mistake data — keep logging!
                          </p>
                        )}
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
