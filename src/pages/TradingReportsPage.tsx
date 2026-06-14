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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user?.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

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
                  className="bg-[#1A1D27] border border-[#2A2D3A] text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all font-medium"
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
                  className="bg-[#1A1D27] border border-[#2A2D3A] text-[#f9fafb] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all font-medium font-mono"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-b border-[#2A2D3A] mt-5 mb-6" />

            {/* SKELETON LOADER STATE */}
            {loading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5 h-[380px] animate-pulse" />
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5 h-[230px] animate-pulse" />
                    <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5 h-[150px] animate-pulse" />
                  </div>
                </div>
              </div>
            ) : trades.length === 0 ? (
              /* EMPTY REPORT STATE */
              <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20 shadow-xl">
                <div className="w-16 h-16 bg-zinc-950/60 rounded-full flex items-center justify-center border border-zinc-800 mb-4">
                  <FileText className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-300 font-display">
                  No trades in {selectedMonth} {selectedYear}
                </h3>
                <p className="text-zinc-500 text-xs mt-1.5 max-w-sm">
                  Log trades to view daily breakdowns, compliance scores, streaks audit, and mistake indexes.
                </p>
                <button
                  onClick={() => navigate('/trade-entry')}
                  className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl px-5 py-3 text-xs uppercase tracking-wider font-mono transition-all shadow-lg shadow-indigo-600/15 cursor-pointer inline-flex items-center gap-1.5"
                >
                  Log a Trade <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* ACTIVE REPORT CONTENT */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                
                {/* LEFT: DAY-BY-DAY TABLE COLUMN */}
                <div className="lg:col-span-2 bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5 overflow-hidden">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
                      Daily Breakdown — {selectedMonth} {selectedYear}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      {dayGroups.length} trading days | {trades.length} total trades
                    </p>
                  </div>

                  {/* TABLE VIEW WRAPPER */}
                  <div className="overflow-x-auto mt-5 border border-zinc-800/60 rounded-xl">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#0F1117] text-[11px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/60">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-3 py-3 text-center">Trades</th>
                          <th className="px-3 py-3">Symbols</th>
                          <th className="px-3 py-3">Setups</th>
                          <th className="px-3 py-3 text-center">W/L/BE</th>
                          <th className="px-4 py-3 text-right">P&L (Day)</th>
                          <th className="px-4 py-3 text-right">Cumulative</th>
                          <th className="px-4 py-3 text-center">Status</th>
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
                              className="border-b border-zinc-800/40 hover:bg-zinc-900/40 transition-colors"
                            >
                              {/* Date Column */}
                              <td className="px-4 py-3 font-semibold text-zinc-100 text-xs whitespace-nowrap">
                                {formattedDate}
                              </td>

                              {/* Trades Count */}
                              <td className="px-3 py-3 text-center font-mono text-zinc-300">
                                {row.tradeCount}
                              </td>

                              {/* Symbols */}
                              <td className="px-3 py-3 font-mono text-xs text-zinc-300 max-w-[100px] truncate" title={row.symbols}>
                                {row.symbols || '—'}
                              </td>

                              {/* Setups */}
                              <td className="px-3 py-3 text-xs text-zinc-400 max-w-[120px] truncate" title={row.setups}>
                                {row.setups || '—'}
                              </td>

                              {/* W/L/BE Badges */}
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold">
                                  {row.wins > 0 && (
                                    <span className="text-green-400 bg-green-950/40 px-1.5 py-0.5 rounded border border-green-900/40 font-mono">
                                      {row.wins}W
                                    </span>
                                  )}
                                  {row.losses > 0 && (
                                    <span className="text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/40 font-mono">
                                      {row.losses}L
                                    </span>
                                  )}
                                  {row.breakevens > 0 && (
                                    <span className="text-zinc-400 bg-zinc-800/50 px-1.5 py-0.5 rounded font-mono">
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
                                  <span className="bg-green-950/60 text-green-400 border border-green-800/40 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                    WIN
                                  </span>
                                ) : row.dayStatus === 'Loss' ? (
                                  <span className="bg-red-950/60 text-red-400 border border-red-800/40 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                    LOSS
                                  </span>
                                ) : (
                                  <span className="bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
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
                          <tr className="bg-zinc-950 border-t-2 border-indigo-800 font-bold">
                            <td className="px-4 py-3.5 text-zinc-200 font-bold uppercase tracking-wider text-xs">
                              TOTAL ({selectedMonth})
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono text-zinc-100 text-xs">
                              {stats.totalTrades}
                            </td>
                            <td className="px-3 py-3.5" />
                            <td className="px-3 py-3.5" />
                            <td className="px-3 py-3.5 text-center font-mono">
                              <span className="text-zinc-300 font-semibold text-xs">
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
                    <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5 shadow-lg">
                      <h3 className="text-sm font-extrabold text-zinc-100 uppercase tracking-widest border-b border-zinc-800 pb-3">
                        {selectedMonth} {selectedYear} Summary
                      </h3>
                      
                      <div className="divide-y divide-zinc-800/40 mt-3">
                        {/* Net P&L */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Net P&L</span>
                          <span className={`text-[13px] font-black font-mono ${pnlColor(stats.totalPnl)}`}>
                            {formatINR(stats.totalPnl)}
                          </span>
                        </div>

                        {/* Total Trades */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Total Trades</span>
                          <span className="text-[13px] font-bold text-zinc-200 font-mono">
                            {stats.totalTrades}
                          </span>
                        </div>

                        {/* W / L / BE Counts */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium font-sans">Win / Loss / BE</span>
                          <span className="text-[11px] font-semibold text-zinc-300 font-mono">
                            {stats.wins} W / {stats.losses} L / {stats.breakevens} BE
                          </span>
                        </div>

                        {/* Win Rate */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Win Rate</span>
                          <span className={`text-[13px] font-black font-mono ${getScoreColor(stats.winRate)}`}>
                            {stats.winRate.toFixed(1)}%
                          </span>
                        </div>

                        {/* Trading Days */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Trading Days</span>
                          <span className="text-[13px] font-bold text-zinc-200 font-mono">
                            {dayGroups.length} days
                          </span>
                        </div>

                        {/* Win Days */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Win Days</span>
                          <span className="text-[12px] font-bold text-green-400 font-mono">
                            {winDays} ({dayGroups.length > 0 ? ((winDays / dayGroups.length) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>

                        {/* Loss Days */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Loss Days</span>
                          <span className="text-[12px] font-bold text-red-400 font-mono">
                            {lossDays}
                          </span>
                        </div>

                        {/* Profit Factor */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Profit Factor</span>
                          <span
                            className={`text-[13px] font-black font-mono ${
                              stats.profitFactor > 1.5
                                ? 'text-green-400'
                                : stats.profitFactor >= 1.0
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          >
                            {stats.profitFactor === 999 ? '∞' : stats.profitFactor.toFixed(2)}
                          </span>
                        </div>

                        {/* Avg R */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium font-sans">Avg R-Multiple</span>
                          <span className={`text-[13px] font-bold font-mono ${pnlColor(stats.avgR)}`}>
                            {stats.avgR >= 0 ? '+' : ''}
                            {stats.avgR.toFixed(2)}R
                          </span>
                        </div>

                        {/* Avg Win */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Avg Win</span>
                          <span className="text-[12px] font-bold text-green-400 font-mono">
                            {formatPositiveINR(stats.avgWin)}
                          </span>
                        </div>

                        {/* Avg Loss */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Avg Loss</span>
                          <span className="text-[12px] font-bold text-red-400 font-mono">
                            -{formatPositiveINR(stats.avgLoss)}
                          </span>
                        </div>

                        {/* Avg W/L Ratio */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Avg W:L Ratio</span>
                          <span className="text-[13px] font-bold text-zinc-200 font-mono">
                            {stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) : '∞'}:1
                          </span>
                        </div>

                        {/* Best Trade */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Best Trade</span>
                          <span className="text-[12px] font-bold text-green-400 font-mono">
                            {formatPositiveINR(stats.largestWin)}
                          </span>
                        </div>

                        {/* Worst Trade */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Worst Trade</span>
                          <span className="text-[12px] font-bold text-red-400 font-mono">
                            -{formatPositiveINR(stats.largestLoss)}
                          </span>
                        </div>

                        {/* Best Day Pnl */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Best Day P&L</span>
                          <span className="text-[12px] font-bold text-green-400 font-mono">
                            {formatPositiveINR(largestProfitDay)}
                          </span>
                        </div>

                        {/* Worst Day Pnl */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Worst Day P&L</span>
                          <span className="text-[12px] font-bold text-red-400 font-mono">
                            -{formatPositiveINR(largestLossDay)}
                          </span>
                        </div>

                        {/* Max Win Streak */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Max Win Streak</span>
                          <span className="text-[12px] font-bold text-green-400 font-mono">
                            {streaks.maxWinStreak} days
                          </span>
                        </div>

                        {/* Max Loss Streak */}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-zinc-500 font-medium">Max Loss Streak</span>
                          <span className="text-[12px] font-bold text-red-400 font-mono">
                            {streaks.maxLossStreak} days
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CARD 2: TRADING COMPLIANCE SCORES */}
                  <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5 shadow-lg">
                    <h3 className="text-sm font-extrabold text-zinc-100 uppercase tracking-widest border-b border-zinc-800 pb-3">
                      Avg Trade Scores
                    </h3>

                    <div className="space-y-4 mt-4">
                      {/* Overall Compliance */}
                      <div className="flex justify-between items-end border-b border-zinc-800/40 pb-2">
                        <span className="text-sm text-zinc-400 font-semibold">Overall Compliance</span>
                        <span className={`text-xl font-extrabold font-mono ${getScoreColor(scores.avgOverall)}`}>
                          {scores.avgOverall.toFixed(0)}%
                        </span>
                      </div>

                      {/* Technical adherence */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500 font-medium">Technical Setup Score</span>
                          <span className={`font-bold font-mono ${getScoreColor(scores.avgTech)}`}>
                            {scores.avgTech.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-[#0F1117] h-2 rounded-full border border-[#2A2D3A] overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${getScoreBg(scores.avgTech)}`}
                            style={{ width: `${scores.avgTech}%` }}
                          />
                        </div>
                      </div>

                      {/* Psychology rating */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500 font-medium">Psychological Control</span>
                          <span className={`font-bold font-mono ${getScoreColor(scores.avgPsych)}`}>
                            {scores.avgPsych.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-[#0F1117] h-2 rounded-full border border-[#2A2D3A] overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${getScoreBg(scores.avgPsych)}`}
                            style={{ width: `${scores.avgPsych}%` }}
                          />
                        </div>
                      </div>

                      {/* Risk Management rating */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500 font-medium">Risk Mgmt Discipline</span>
                          <span className={`font-bold font-mono ${getScoreColor(scores.avgRisk)}`}>
                            {scores.avgRisk.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-[#0F1117] h-2 rounded-full border border-[#2A2D3A] overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${getScoreBg(scores.avgRisk)}`}
                            style={{ width: `${scores.avgRisk}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: PSYCHOLOGICAL & TECHNICAL MISTAKES */}
                  <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-5 shadow-lg">
                    <h3 className="text-sm font-extrabold text-zinc-100 uppercase tracking-widest border-b border-zinc-800 pb-3">
                      Mistakes This Month
                    </h3>

                    <div className="mt-4 space-y-2.5 text-xs text-zinc-400">
                      <div className="flex justify-between border-b border-zinc-850 pb-1.5 font-medium">
                        <span>Technical Setup</span>
                        <span className="font-mono text-indigo-400 font-bold">{mistakeMap.Technical}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-850 pb-1.5 font-medium">
                        <span>Psychological Control</span>
                        <span className="font-mono text-purple-400 font-bold">{mistakeMap.Psychological}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-850 pb-1.5 font-medium">
                        <span>Risk Management Breach</span>
                        <span className="font-mono text-amber-500 font-bold">{mistakeMap['Risk Management']}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Flawless Execution</span>
                        <span className="font-mono text-green-400 font-bold">{mistakeMap['No Mistake']}</span>
                      </div>

                      {/* Specific Textual Mistakes Insights */}
                      <div className="border-t border-[#2A2D3A] pt-3.5 mt-3 space-y-2">
                        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                          Most Repeated Mistakes
                        </h4>
                        
                        {topMistakesList.length > 0 ? (
                          <div className="space-y-1.5">
                            {topMistakesList.map(([text, count], idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-start gap-1 bg-zinc-950/40 border border-zinc-800/40 p-2 rounded-lg font-mono text-[10px]"
                              >
                                <span className="text-zinc-300 leading-tight block break-words max-w-[200px]">
                                  {text}
                                </span>
                                <span className="text-red-400 font-bold shrink-0 ml-1">
                                  ×{count}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-green-400 italic">
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
