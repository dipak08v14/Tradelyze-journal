import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import { RadarScoreChart } from '../components/RadarScoreChart';
import { RuleChecklistDisplay } from '../components/RuleChecklistDisplay';
import {
  Menu,
  ChevronLeft,
  Pencil,
  Trash2,
  AlertTriangle,
  HelpCircle,
  FileText,
  ExternalLink,
  Star,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';
import { Trade } from '../types';

export const TradeTrackingPage: React.FC = () => {
  const { id: tradeId } = useParams<{ id: string }>();
  const { user, userId, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Primary Data States
  const [trade, setTrade] = useState<any>(null);
  const [entryRules, setEntryRules] = useState<any[]>([]);
  const [exitRules, setExitRules] = useState<any[]>([]);
  const [psychology, setPsychology] = useState<any>(null);
  const [riskMgmt, setRiskMgmt] = useState<any>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Authenticated safety
  useEffect(() => {
    if (!authLoading && !userId) {
      navigate('/login');
    }
  }, [userId, authLoading, navigate]);

  // Load complete trade metrics context
  const fetchCompleteTradeContextData = async () => {
    if (!userId || !tradeId) return;
    try {
      setLoading(true);

      const [tradeResult, rulesResult, psychResult, riskResult] = await Promise.all([
        supabase
          .from('trades')
          .select('*, strategies(name, type_of_strategy)')
          .eq('id', tradeId)
          .eq('user_id', userId)
          .single(),
        supabase
          .from('trade_rule_adherence')
          .select('*')
          .eq('trade_id', tradeId)
          .eq('user_id', userId)
          .order('rule_type')
          .order('rule_order', { ascending: true }),
        supabase
          .from('trade_psychology')
          .select('*')
          .eq('trade_id', tradeId)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('trade_risk_management')
          .select('*')
          .eq('trade_id', tradeId)
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (tradeResult.error) {
        throw new Error(tradeResult.error.message || 'Trade records could not be fetched.');
      }

      setTrade(tradeResult.data);

      const allRules = rulesResult.data || [];
      setEntryRules(allRules.filter((r) => r.rule_type === 'entry'));
      setExitRules(allRules.filter((r) => r.rule_type === 'exit'));

      setPsychology(psychResult.data || null);
      setRiskMgmt(riskResult.data || null);

    } catch (err: any) {
      console.error('Error fetching trade tracking details:', err);
      showError(err.message || 'Failed to sync entire trade analytics context.');
      navigate('/trading-logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompleteTradeContextData();
  }, [userId, tradeId]);

  // Calculations for Scores (Technical %, Psychology %, Risk %, Overall %)
  const technicalScore = React.useMemo(() => {
    const totalCount = entryRules.length + exitRules.length;
    if (totalCount === 0) return 0;
    const followedCount =
      entryRules.filter((r) => r.followed === true).length +
      exitRules.filter((r) => r.followed === true).length;
    return (followedCount / totalCount) * 100;
  }, [entryRules, exitRules]);

  const psychScore = React.useMemo(() => {
    return psychology?.psychological_condition_pct ?? 0;
  }, [psychology]);

  const riskScore = React.useMemo(() => {
    return riskMgmt?.followed_risk_rules_pct ?? 0;
  }, [riskMgmt]);

  const overallScore = React.useMemo(() => {
    return (technicalScore + psychScore + riskScore) / 3;
  }, [technicalScore, psychScore, riskScore]);

  // Score styling color code mapper
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreFillColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Indian Rupees Local Currency format
  const formatINR = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    const prefix = val < 0 ? '-₹' : '₹';
    return `${prefix}${Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Human date parser
  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Delete trade cascade execution
  const handleDeleteTrade = async () => {
    if (!userId || !tradeId || !trade) return;
    try {
      setIsDeleting(true);

      // 1. Storage remove for Chart Screenshot if exists
      if (trade.chart_image_url) {
        const parts = trade.chart_image_url.split('/trade-media/');
        if (parts.length > 1) {
          const fileName = decodeURIComponent(parts[1]);
          await supabase.storage.from('trade-media').remove([fileName]);
        }
      }

      // 2. Storage remove for Trade Plan PDF/image if exists
      if (trade.trade_plan_url) {
        const parts = trade.trade_plan_url.split('/trade-media/');
        if (parts.length > 1) {
          const fileName = decodeURIComponent(parts[1]);
          await supabase.storage.from('trade-media').remove([fileName]);
        }
      }

      // 3. Delete from "trades" (foreign key cascade handles rule adherence, psych, and risk records)
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId)
        .eq('user_id', userId);

      if (error) throw error;

      showSuccess('Trade record deleted successfully.');
      navigate('/trading-logs');
    } catch (err: any) {
      console.error('Error deleting trade:', err);
      showError(err.message || 'An error occurred while executing delete process.');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Helpers to render stars
  const renderStars = (rating: number | null) => {
    if (!rating || rating <= 0) return <span className="text-zinc-650">—</span>;
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Star
            key={idx}
            className={`w-4 h-4 ${idx < rating ? 'fill-current text-amber-400' : 'text-zinc-700'}`}
          />
        ))}
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <div className="w-9 h-9 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-3" />
        <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Fetching trade profile...</p>
      </div>
    );
  }

  if (!user || !trade) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-6">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-2" />
        <h2 className="text-xl font-bold text-zinc-100">Trade Profile Missing</h2>
        <p className="text-zinc-500 text-sm mt-1 mb-6 text-center max-w-sm">
          We could not load this trade index. It may have been deleted or lives on another profile.
        </p>
        <Link
          to="/trading-logs"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Logs</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* MAIN CONTAINER */}
      <div className="flex-1 md:pl-[250px] flex flex-col min-h-screen">
        {/* MOBILE HEADER BAR */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 md:hidden bg-zinc-900 sticky top-0 z-25">
          <div className="text-xl font-bold text-indigo-400 tracking-wider font-display">TRADELYZE</div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* PAGE BODY SCROLLER */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            
            {/* BREADCRUMB ANCHOR */}
            <div className="mb-3">
              <Link
                to="/trading-logs"
                className="text-indigo-400 hover:text-indigo-300 text-sm inline-flex items-center gap-1 font-medium transition-all group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Trading Logs</span>
              </Link>
            </div>

            {/* ACTIONABLE ROW */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-100 font-display">
                    {trade.symbol} — {trade.call_put || 'Trade Profile'}
                  </h1>

                  {/* WIN/LOSS tag */}
                  {trade.status === 'Win' && (
                    <span className="bg-green-950/80 border border-green-700/80 text-green-300 text-xs font-bold px-3 py-1 rounded-lg">
                      ✓ WIN
                    </span>
                  )}
                  {trade.status === 'Loss' && (
                    <span className="bg-red-950/80 border border-red-700/80 text-red-300 text-xs font-bold px-3 py-1 rounded-lg">
                      ✗ LOSS
                    </span>
                  )}
                  {trade.status === 'Breakeven' && (
                    <span className="bg-zinc-850 border border-zinc-750 text-zinc-300 text-xs font-bold px-3 py-1 rounded-lg">
                      — BE
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-sm text-zinc-400">
                  <span className="font-mono text-xs">{formatFullDate(trade.date)}</span>
                  <span className="text-zinc-650">•</span>
                  {trade.strategies && (
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-950/55 text-indigo-400 border border-indigo-900 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded font-mono">
                        {trade.strategies.type_of_strategy || 'Default'}
                      </span>
                      <span className="text-zinc-300 font-semibold">{trade.strategies.name}</span>
                    </div>
                  )}
                  {!trade.strategies && <span className="text-zinc-650 italic">No Setup Linked</span>}
                </div>
              </div>

              {/* CONTROLS */}
              <div className="flex flex-wrap items-center gap-2.5 mt-2 md:mt-0">
                {/* Ask AI - Placeholder */}
                <div className="relative group">
                  <button
                    disabled
                    type="button"
                    className="bg-zinc-900 border border-zinc-800 text-zinc-500 font-semibold rounded-xl px-3.5 py-2.5 text-xs inline-flex items-center gap-1.5 cursor-not-allowed"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-zinc-600 animate-pulse" />
                    <span>Ask AI ✨</span>
                  </button>
                  <div className="pointer-events-none opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 rounded-lg py-1.5 px-3 w-32 shadow-xl text-center font-mono leading-tight z-10 transition-opacity">
                    Coming in Phase 7
                  </div>
                </div>

                {/* Edit */}
                <Link
                  to={`/trade-entry/${trade.id}`}
                  className="bg-[#1A1D27] border border-[#2A2D3A] text-zinc-100 hover:bg-[#2A2D3A] font-semibold rounded-xl px-4 py-2.5 text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Trade</span>
                </Link>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="bg-red-950/40 border border-red-900/60 text-red-400 hover:bg-red-900/40 font-semibold rounded-xl px-4 py-2.5 text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            <div className="border-b border-zinc-800/80 mt-5 mb-8" />

            {/* THREE-COLUMN BENTO GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* LEFT SPANNING TWO COLUMNS */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* CARD A: TRADE DETAILS */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-zinc-100 font-display">Trade Accountancies</h2>
                  </div>

                  {/* FINANCIAL GRID */}
                  <div>
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-500 mb-3 border-b border-zinc-850 pb-1">
                      Financial Calculations
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {/* P&L */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-zinc-850">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">P&L Gain/Loss</span>
                        <span
                          className={`text-lg font-black font-mono block mt-1 ${
                            trade.pnl > 0 ? 'text-green-400' : trade.pnl < 0 ? 'text-red-400' : 'text-zinc-400'
                          }`}
                        >
                          {formatINR(trade.pnl)}
                        </span>
                      </div>

                      {/* R-Multiple */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-zinc-850">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">R-Multiple Earned</span>
                        <span
                          className={`text-lg font-black font-mono block mt-1 ${
                            trade.r_multiple > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {trade.r_multiple !== null ? `${trade.r_multiple > 0 ? '+' : ''}${trade.r_multiple.toFixed(2)}R` : '—'}
                        </span>
                      </div>

                      {/* ROI */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-zinc-850">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">Return on Investment</span>
                        <span
                          className={`text-lg font-black font-mono block mt-1 ${
                            trade.roi > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {trade.roi !== null ? `${trade.roi > 0 ? '+' : ''}${trade.roi.toFixed(1)}%` : '—'}
                        </span>
                      </div>

                      {/* Risk */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-[#2A2D3A]">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">Actual Risk Taken</span>
                        <span className="text-zinc-200 text-sm font-bold block mt-1 font-mono">
                          {formatINR(trade.risk)}
                        </span>
                      </div>

                      {/* Investment */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-[#2A2D3A]">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">Total Allocation</span>
                        <span className="text-zinc-200 text-sm font-bold block mt-1 font-mono">
                          {formatINR(trade.investment)}
                        </span>
                      </div>

                      {/* Fees */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-[#2A2D3A]">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">Brokerage Fees</span>
                        <span className="text-zinc-200 text-sm font-bold block mt-1 font-mono">
                          {formatINR(trade.fees)}
                        </span>
                      </div>

                      {/* Quantity */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-[#2A2D3A]">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">Quantity / Lots</span>
                        <span className="text-zinc-200 text-sm font-bold block mt-1 font-mono">
                          {trade.quantity !== null ? trade.quantity : '—'}
                        </span>
                      </div>

                      {/* Points */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-[#2A2D3A]">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">Capture Points</span>
                        <span className="text-zinc-200 text-sm font-bold block mt-1 font-mono">
                          {trade.points !== null ? trade.points : '—'}
                        </span>
                      </div>

                      {/* Holding Time */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-[#2A2D3A]">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">Holding Duration</span>
                        <span className="text-zinc-200 text-sm font-bold block mt-1 font-mono">
                          {trade.holding_time_mins !== null ? `${trade.holding_time_mins} mins` : '—'}
                        </span>
                      </div>

                      {/* Max Drawdown */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-[#2A2D3A]">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">Max Drawdown (DD)</span>
                        <span className="text-red-400 text-sm font-bold block mt-1 font-mono">
                          {formatINR(trade.max_drawdown)}
                        </span>
                      </div>

                      {/* MDD % */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-[#2A2D3A]">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">Drawdown %</span>
                        <span className="text-red-400 text-sm font-bold block mt-1 font-mono">
                          {trade.mdd_pct !== null ? `${trade.mdd_pct.toFixed(2)}%` : '—'}
                        </span>
                      </div>

                      {/* ROR */}
                      <div className="bg-zinc-950/45 p-3.5 rounded-xl border border-[#2A2D3A]">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-mono">Risk of Ruin (ROR)</span>
                        <span className="text-zinc-200 text-sm font-bold block mt-1 font-mono">
                          {trade.ror !== null ? `${trade.ror.toFixed(2)}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CONTEXT GRID */}
                  <div className="mt-6 pt-5 border-t border-zinc-800">
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-500 mb-3 pb-1">
                      Trading Context Variables
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <span className="block text-[10px] text-zinc-500 uppercase font-mono">Entry Time</span>
                        <span className="text-zinc-300 text-xs font-bold block mt-0.5">{trade.entry_time || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500 uppercase font-mono">Market Phase</span>
                        <span className="text-zinc-300 text-xs font-bold block mt-0.5">{trade.phase || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500 uppercase font-mono">Trend Location</span>
                        <span className="text-zinc-300 text-xs font-bold block mt-0.5">{trade.trend_position || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500 uppercase font-mono">Opening State</span>
                        <span className="text-zinc-300 text-xs font-bold block mt-0.5">{trade.opening_condition || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500 uppercase font-mono">Hourly Trend</span>
                        <span className="text-zinc-300 text-xs font-bold block mt-0.5">{trade.hourly_trend || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500 uppercase font-mono">Vantage Month / Yr</span>
                        <span className="text-zinc-300 text-xs font-bold block mt-0.5 font-mono">
                          {trade.month} {trade.year}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* CARD B: ENTRY RULES SHAPED DISPLAY */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-green-400" />
                      <h2 className="text-lg font-bold text-zinc-100 font-display">Entry Rules Checklist</h2>
                    </div>
                    <span className="text-zinc-500 text-xs font-bold bg-zinc-950 px-2 py-1 rounded-md border border-zinc-850 font-mono">
                      {entryRules.length} Rules Setup
                    </span>
                  </div>
                  <RuleChecklistDisplay rules={entryRules} ruleType="entry" />
                </section>

                {/* CARD C: EXIT RULES SHAPED DISPLAY */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-red-400" />
                      <h2 className="text-lg font-bold text-zinc-100 font-display">Exit Rules Checklist</h2>
                    </div>
                    <span className="text-zinc-500 text-xs font-bold bg-zinc-950 px-2 py-1 rounded-md border border-zinc-850 font-mono">
                      {exitRules.length} Rules Setup
                    </span>
                  </div>
                  <RuleChecklistDisplay rules={exitRules} ruleType="exit" />
                </section>

                {/* CARD D: GENERAL EXECUTION QUALITY & TRADER NOTES */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-zinc-100 font-display">Execution & Notes</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Execution left side parameters */}
                    <div className="space-y-4">
                      <div>
                        <span className="block text-[10px] font-bold font-mono text-zinc-550 uppercase tracking-widest mb-1.5">
                          Execution Match Class
                        </span>
                        {trade.execution_status ? (
                          <span
                            className={`inline-block px-3 py-1 text-xs font-extrabold uppercase tracking-widest font-mono rounded-lg border ${
                              trade.execution_status === 'BEST TRADE'
                                ? 'bg-green-950/80 text-green-400 border-green-800'
                                : trade.execution_status === 'GOOD TRADE'
                                ? 'bg-teal-950/80 text-teal-400 border-teal-800'
                                : trade.execution_status === 'AVERAGE TRADE'
                                ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                                : trade.execution_status === 'POOR TRADE'
                                ? 'bg-orange-950/80 text-orange-400 border-orange-800'
                                : 'bg-red-950/80 text-red-400 border-red-800'
                            }`}
                          >
                            {trade.execution_status}
                          </span>
                        ) : (
                          <span className="text-zinc-650 italic text-xs">Uncategorized execution</span>
                        )}
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold font-mono text-zinc-550 uppercase tracking-widest mb-1">
                          Mistake Categorization
                        </span>
                        <div className="text-sm font-semibold text-zinc-200 mt-1 flex items-center gap-1.5">
                          {trade.mistake_type === 'No Mistake' || !trade.mistake_type ? (
                            <span className="text-green-400 font-bold bg-green-950/40 border border-green-900 px-2.5 py-0.5 rounded text-xs inline-block">
                              No Mistake
                            </span>
                          ) : (
                            <span className="text-red-400 font-bold bg-red-950/40 border border-red-900 px-2.5 py-0.5 rounded text-xs inline-block">
                              {trade.mistake_type}
                            </span>
                          )}
                        </div>
                        {trade.mistake_text && (
                          <p className="text-zinc-400 text-xs mt-2 italic bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850">
                            {trade.mistake_text}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold font-mono text-zinc-550 uppercase tracking-widest mb-1.5">
                          Synthesized Star Rating
                        </span>
                        {renderStars(trade.trade_rating)}
                        <span className="text-[11px] text-zinc-500 font-mono mt-1 block">
                          {trade.trade_rating || 0} out of 5 stars
                        </span>
                      </div>
                    </div>

                    {/* Notes Box view */}
                    <div className="flex flex-col">
                      <span className="block text-[10px] font-bold font-mono text-zinc-550 uppercase tracking-widest mb-2">
                        Post-Trade Reflections
                      </span>
                      <div className="bg-zinc-950/60 rounded-xl p-4 border border-zinc-850 flex-1 min-h-[140px]">
                        {trade.notes ? (
                          <p className="text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap">
                            {trade.notes}
                          </p>
                        ) : (
                          <p className="text-zinc-600 text-xs italic">
                            No diary notes transcribed for this trade.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* RIGHT SPANNING ONE COLUMN BENTO RAILS */}
              <div className="space-y-6">
                
                {/* CARD E: KEY PERFORMANCE SCOREBOARD + SPIDER RADAR */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                  <h2 className="text-lg font-bold text-zinc-100 font-display mb-1">
                    Performance Score
                  </h2>
                  <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">Multidimensional analysis</p>

                  <div className="flex flex-col items-center justify-center mt-4">
                    {/* Big Score tag */}
                    <div className={`text-4xl font-black font-display tracking-tight ${getScoreColor(overallScore)}`}>
                      {overallScore.toFixed(0)}%
                    </div>
                    <div className="text-[10px] font-bold font-mono text-zinc-550 uppercase tracking-wider mt-1">
                      Integrity Index
                    </div>
                  </div>

                  {/* Horizontal progress bars with reuse logic */}
                  <div className="mt-5 space-y-4 pt-4 border-t border-zinc-850">
                    {/* Technical bar */}
                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
                        <span className="text-zinc-400">Technical Rules (checklists)</span>
                        <span className={getScoreColor(technicalScore)}>{technicalScore.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden w-full">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getScoreFillColor(technicalScore)}`}
                          style={{ width: `${technicalScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Psychology bar */}
                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
                        <span className="text-zinc-400">Psychology (mindfulness)</span>
                        <span className={getScoreColor(psychScore)}>{psychScore.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden w-full">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getScoreFillColor(psychScore)}`}
                          style={{ width: `${psychScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Risk bar */}
                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
                        <span className="text-zinc-400">Risk Management (guidelines)</span>
                        <span className={getScoreColor(riskScore)}>{riskScore.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden w-full">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getScoreFillColor(riskScore)}`}
                          style={{ width: `${riskScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* RADAR SCORE CHART IF INTEGRATED */}
                  <div className="mt-6 pt-3 border-t border-zinc-850">
                    <RadarScoreChart
                      technicalScore={technicalScore}
                      psychScore={psychScore}
                      riskScore={riskScore}
                    />
                  </div>
                </section>

                {/* CARD F: PSYCHOLOGY SUB-METRICS ANALYSIS */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                  <h2 className="text-lg font-bold text-zinc-100 font-display">
                    Psychology Spectrum
                  </h2>
                  <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider mb-2">Subjective states</p>

                  {!psychology ? (
                    <div className="text-zinc-500 text-xs italic py-4">No cognitive feedback logged.</div>
                  ) : (
                    <div className="space-y-4 mt-3">
                      
                      {/* External Stress */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-zinc-400">External Factors / Stress</span>
                          <span className="text-zinc-200 font-bold font-mono">{psychology.external_stress_pct}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400" style={{ width: `${psychology.external_stress_pct}%` }} />
                        </div>
                      </div>

                      {/* Price Action */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-zinc-400">Price Action Reading</span>
                          <span className="text-zinc-200 font-bold font-mono">{psychology.price_action_reading_pct}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400" style={{ width: `${psychology.price_action_reading_pct}%` }} />
                        </div>
                      </div>

                      {/* Confidence */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-zinc-400">Self Confidence</span>
                          <span className="text-zinc-200 font-bold font-mono">{psychology.confidence_pct}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400" style={{ width: `${psychology.confidence_pct}%` }} />
                        </div>
                      </div>

                      {/* Entry Level Confidence */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-zinc-400">Entry Levels Confidence</span>
                          <span className="text-zinc-200 font-bold font-mono">{psychology.entry_levels_pct}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400" style={{ width: `${psychology.entry_levels_pct}%` }} />
                        </div>
                      </div>

                      {/* Anxiety */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-400">Anxiety</span>
                            <span className="text-[10px] text-amber-500 font-mono font-bold">(lower is better)</span>
                          </div>
                          <span className="text-amber-500 font-bold font-mono">{psychology.anxiety_pct}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-500" style={{ width: `${psychology.anxiety_pct}%` }} />
                        </div>
                      </div>

                      {/* Fear */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-400">Fear</span>
                            <span className="text-[10px] text-red-500 font-mono font-bold">(lower is better)</span>
                          </div>
                          <span className="text-red-500 font-bold font-mono">{psychology.fear_pct}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-500" style={{ width: `${psychology.fear_pct}%` }} />
                        </div>
                      </div>

                      {/* Summary psychological score condition */}
                      <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                          Psychological Score
                        </span>
                        <span className={`text-base font-black font-mono ${getScoreColor(psychScore)}`}>
                          {psychScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </section>

                {/* CARD G: RISK MANAGEMENT RULES FOLLOWED */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                  <h2 className="text-lg font-bold text-zinc-100 font-display">Risk Management</h2>
                  <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider mb-2">Exposure analysis</p>

                  {!riskMgmt ? (
                    <div className="text-zinc-500 text-xs italic py-4">No risk logs found.</div>
                  ) : (
                    <div className="space-y-4 mt-3">
                      <div className="grid grid-cols-2 gap-3.5 bg-zinc-950/45 p-3 rounded-xl border border-zinc-850">
                        <div>
                          <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-brand font-mono">Planned Risk</span>
                          <span className="text-zinc-200 text-xs font-semibold block mt-0.5 font-mono">
                            {formatINR(riskMgmt.decided_risk)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-brand font-mono">Actual Risk Taken</span>
                          <span className="text-zinc-200 text-xs font-semibold block mt-0.5 font-mono">
                            {formatINR(trade.risk)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold font-mono mb-1.5">
                          <span className="text-zinc-400">Risk Rules Adherence</span>
                          <span className={getScoreColor(riskScore)}>{riskScore}%</span>
                        </div>
                        <div className="h-2 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden w-full">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getScoreFillColor(riskScore)}`}
                            style={{ width: `${riskScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* CARD H: MEDIA VIEWER ZONE */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                  <h2 className="text-lg font-bold text-zinc-100 font-display mb-3">
                    Trade Attachments
                  </h2>

                  <div className="space-y-4 text-xs">
                    {/* Chart Screenshot */}
                    <div>
                      <span className="block text-[10px] font-bold font-mono text-zinc-550 uppercase tracking-widest mb-1.5">
                        Chart Screenshot
                      </span>
                      {trade.chart_image_url ? (
                        <div className="relative group rounded-xl overflow-hidden border border-zinc-850 bg-zinc-950">
                          <img
                            src={trade.chart_image_url}
                            alt="Chart execution screenshot"
                            className="w-full object-contain max-h-48 cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                            onClick={() => window.open(trade.chart_image_url, '_blank')}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                            <span className="text-[10px] font-bold uppercase text-white font-mono flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                              <ExternalLink className="w-3 h-3" />
                              <span>View Original</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-zinc-600 italic p-3 bg-zinc-950/20 border border-dashed border-zinc-850 rounded-xl text-center">
                          No chart image snapshot archived.
                        </div>
                      )}
                    </div>

                    {/* Trade Video Recording */}
                    {trade.trade_video_url && (
                      <div className="pt-2 border-t border-zinc-850">
                        <span className="block text-[10px] font-bold font-mono text-zinc-550 uppercase tracking-widest mb-2">
                          Trade Recording Video
                        </span>
                        <button
                          type="button"
                          onClick={() => window.open(trade.trade_video_url, '_blank')}
                          className="w-full bg-[#1A1D27] hover:bg-[#2A2D3A] border border-[#2A2D3A] text-zinc-300 font-semibold rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Watch Playback Recording</span>
                        </button>
                      </div>
                    )}

                    {/* Trade Plan PDF/image */}
                    {trade.trade_plan_url && (
                      <div className="pt-2 border-t border-zinc-850">
                        <span className="block text-[10px] font-bold font-mono text-zinc-550 uppercase tracking-widest mb-2">
                          Associated Trade Plan
                        </span>
                        {trade.trade_plan_url.toLowerCase().endsWith('.pdf') ? (
                          <button
                            type="button"
                            onClick={() => window.open(trade.trade_plan_url, '_blank')}
                            className="w-full bg-[#1A1D27] hover:bg-[#2A2D3A] border border-[#2A2D3A] text-zinc-300 font-semibold rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Read Trade Plan (PDF)</span>
                          </button>
                        ) : (
                          <div className="relative group rounded-xl overflow-hidden border border-zinc-850 bg-zinc-950">
                            <img
                              src={trade.trade_plan_url}
                              alt="Trade plan chart/model"
                              className="w-full object-contain max-h-48 cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                              onClick={() => window.open(trade.trade_plan_url, '_blank')}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                              <span className="text-[10px] font-bold uppercase text-white font-mono flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                                <ExternalLink className="w-3 h-3" />
                                <span>Inspect Plan</span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* CONFIRM DELETE MODAL DIALOG */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Delete Trade Log Entry"
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-red-950/60 border border-red-800/80 rounded-full flex items-center justify-center mx-auto text-red-400 mb-4 scale-110">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-zinc-100">Permanently Delete Trade?</h4>
          <p className="text-zinc-400 text-xs mt-3.5 leading-relaxed">
            This action will permanently delete <span className="font-bold text-zinc-200 font-mono">{trade.symbol}</span>'s records from <span className="font-bold text-zinc-200 font-mono">{trade.date}</span>. All diagnostic rule metrics, psychological spectrum states, and risk statistics will be erased. This is irreversible.
          </p>
          
          <div className="flex items-center justify-center gap-3 mt-7">
            {/* Cancel */}
            <button
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
              className="bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors min-w-[90px]"
            >
              Cancel
            </button>
            {/* Delete */}
            <button
              disabled={isDeleting}
              onClick={handleDeleteTrade}
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl px-4 py-2.5 text-xs uppercase tracking-widest font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-w-[120px]"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deleting</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
