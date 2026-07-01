import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Plus,
  Trash2,
  Image
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

interface MissedTradeItem {
  id: string;
  user_id: string;
  strategy_id: string;
  date: string;
  symbol: string;
  direction: 'LONG' | 'SHORT' | string;
  notes: string | null;
  potential_pnl: number | null;
  created_at: string;
}

const PREDEFINED_SYMBOLS = [
  // Forex
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'USDINR', 'EURINR',
  // Gold/Silver
  'XAUUSD', 'XAGUSD',
  // Crypto
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT',
  // Indian Indices
  'NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'MIDCPNIFTY',
  // US Indices
  'US30', 'NAS100', 'SPX500',
  // MCX
  'GOLD', 'SILVER', 'CRUDEOIL', 'NATURALGAS',
  // Stocks
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'WIPRO', 'ADANIENT', 'BAJFINANCE', 'TATAMOTORS'
];

type TabType = 'OVERVIEW' | 'RULES PERFORMANCE' | 'EXECUTED TRADES' | 'MISSED TRADES' | 'NOTES' | 'REFERENCE';

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
  const [missedTrades, setMissedTrades] = useState<MissedTradeItem[]>([]);

  // Add missed trade modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [mtDate, setMtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mtSymbol, setMtSymbol] = useState('');
  const [mtDirection, setMtDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [mtPotentialPnl, setMtPotentialPnl] = useState('');
  const [mtNotes, setMtNotes] = useState('');
  const [showMtSuggestions, setShowMtSuggestions] = useState(false);
  const mtSymbolContainerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string>('');
  const [notesText, setNotesText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handlePrevImage = () => {
    if (lightboxIndex === null || !strategy?.reference_images) return;
    const total = strategy.reference_images.length;
    setLightboxIndex((lightboxIndex - 1 + total) % total);
  };

  const handleNextImage = () => {
    if (lightboxIndex === null || !strategy?.reference_images) return;
    const total = strategy.reference_images.length;
    setLightboxIndex((lightboxIndex + 1) % total);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex !== null) {
        if (e.key === 'Escape') {
          setLightboxIndex(null);
        } else if (e.key === 'ArrowLeft') {
          handlePrevImage();
        } else if (e.key === 'ArrowRight') {
          handleNextImage();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, strategy?.reference_images]);

  // Executed trades pagination page state
  const [tradePage, setTradePage] = useState<number>(1);
  const tradesPerPage = 25;

  // Retrieve complete context for the strategy
  const fetchStrategyContext = async () => {
    if (!userId || !strategyId) return;
    try {
      setLoading(true);

      const [strategyRes, tradesRes, rulesRes, missedTradesRes] = await Promise.all([
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
          .order('rule_order', { ascending: true }),
        supabase
          .from('missed_trades')
          .select('id, user_id, strategy_id, date, symbol, direction, notes, potential_pnl, created_at')
          .eq('strategy_id', strategyId)
          .eq('user_id', userId)
          .order('date', { ascending: false })
      ]);

      if (strategyRes.error) throw strategyRes.error;
      if (tradesRes.error) throw tradesRes.error;
      if (rulesRes.error) throw rulesRes.error;
      if (missedTradesRes.error) throw missedTradesRes.error;

      if (!strategyRes.data) {
        showError('Strategy not found.');
        navigate('/strategies');
        return;
      }

      setStrategy(strategyRes.data as StrategyDetailItem);
      setNotesText(strategyRes.data.notes || '');
      setTrades((tradesRes.data as TradeItem[]) || []);
      setMissedTrades((missedTradesRes.data as MissedTradeItem[]) || []);
      
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

  // Formatting date as "DD Mon YYYY"
  const formatDateCustom = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Missed trades stats
  const missedTradesStats = useMemo(() => {
    const totalMissed = missedTrades.length;
    const withPnl = missedTrades.filter(m => m.potential_pnl !== null && m.potential_pnl !== undefined);
    const potentialPnlSum = missedTrades.reduce((sum, mt) => sum + (mt.potential_pnl || 0), 0);
    const avgPotential = withPnl.length > 0 ? potentialPnlSum / withPnl.length : 0;

    return {
      totalMissed,
      potentialPnlSum,
      avgPotential
    };
  }, [missedTrades]);

  // Hook up event handles for missed trades suggestions
  useEffect(() => {
    const handleCloseSuggestions = (e: MouseEvent) => {
      if (mtSymbolContainerRef.current && !mtSymbolContainerRef.current.contains(e.target as Node)) {
        setShowMtSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleCloseSuggestions);
    return () => document.removeEventListener('mousedown', handleCloseSuggestions);
  }, []);

  const mtSuggestions = useMemo(() => {
    if (!mtSymbol.trim()) return [];
    return PREDEFINED_SYMBOLS.filter((s) =>
      s.toLowerCase().includes(mtSymbol.toLowerCase())
    ).slice(0, 6);
  }, [mtSymbol]);

  // Hook up handle handlers logic
  const handleSaveMissedTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !strategyId) return;

    if (!mtDate.trim()) {
      showError("Please select a date.");
      return;
    }
    if (!mtSymbol.trim()) {
      showError("Please enter a symbol.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('missed_trades')
        .insert({
          user_id: userId,
          strategy_id: strategyId,
          date: mtDate,
          symbol: mtSymbol.toUpperCase().trim(),
          direction: mtDirection,
          potential_pnl: mtPotentialPnl.trim() !== '' ? parseFloat(mtPotentialPnl) : null,
          notes: mtNotes.trim() !== '' ? mtNotes.trim() : null
        })
        .select();

      if (error) throw error;

      showSuccess("Missed trade logged successfully!");
      
      // Close modal
      setAddModalOpen(false);

      // Reset form
      setMtDate(new Date().toISOString().split('T')[0]);
      setMtSymbol('');
      setMtDirection('LONG');
      setMtPotentialPnl('');
      setMtNotes('');

      // Refresh list
      const { data: updatedMissed, error: fetchErr } = await supabase
        .from('missed_trades')
        .select('id, user_id, strategy_id, date, symbol, direction, notes, potential_pnl, created_at')
        .eq('strategy_id', strategyId)
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (fetchErr) throw fetchErr;
      setMissedTrades((updatedMissed as MissedTradeItem[]) || []);
    } catch (err: any) {
      console.error(err);
      showError(err.message || "Failed to log missed trade.");
    }
  };

  const handleDeleteMissedTrade = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('missed_trades')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess("Missed trade deleted.");
      setMissedTrades(prev => prev.filter(mt => mt.id !== id));
    } catch (err: any) {
      console.error(err);
      showError(err.message || "Failed to delete missed trade.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center animate-pulse" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }}></div>
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
            className="p-1.5 rounded-lg cursor-pointer hover:text-white"
            style={{ color: 'var(--text-sub)' }}
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-0">
          <div className="max-w-7xl mx-auto">
            {/* BREADCRUMB ROW */}
            <Link
              to="/strategies"
              style={{ color: 'var(--accent)' }}
              className="hover:opacity-90 text-sm inline-flex items-center gap-1 font-medium transition-all group mb-1"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Strategies</span>
            </Link>

            {/* STRATEGY HEADER BLOCK */}
            <div
              className="flex flex-row items-center justify-between gap-4"
              style={{
                background: 'var(--card)',
                width: 'calc(100% + 48px)',
                marginLeft: '-24px',
                marginRight: '-24px',
                paddingLeft: '24px',
                paddingRight: '24px',
                paddingTop: '3px',
                paddingBottom: '3px',
                borderBottom: '1px solid var(--border)',
                marginBottom: '16px'
              }}
            >
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight font-display" style={{ color: 'var(--text)' }}>
                    {strategy ? strategy.name : 'Strategy details'}
                  </h1>
                  {strategy && (
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border shadow-sm shrink-0" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                      {strategy.type_of_strategy}
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                  STATUS:{' '}
                  <span
                    className="font-bold uppercase animate-fade-in"
                    style={{
                      color:
                        strategy?.status?.toLowerCase() === 'active'
                          ? '#10b981'
                          : strategy?.status?.toLowerCase() === 'not working'
                          ? '#f59e0b'
                          : '#71717a'
                    }}
                  >
                    {strategy?.status ? strategy.status.toUpperCase() : 'ACTIVE'}
                  </span>
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
            <div className="flex items-center overflow-x-auto gap-1 sticky top-0 z-10 scrollbar-none mb-3 px-1 py-1 rounded-lg" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
              {(['OVERVIEW', 'RULES PERFORMANCE', 'EXECUTED TRADES', 'MISSED TRADES', 'NOTES', 'REFERENCE'] as TabType[]).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={
                      active
                        ? "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap rounded"
                        : "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap rounded-xl"
                    }
                    style={
                      active
                        ? { backgroundColor: 'var(--card)', color: 'var(--accent)', border: '0.5px solid var(--border)', borderRadius: '6px' }
                        : { backgroundColor: 'transparent', color: 'var(--text-sub)', border: '0.5px solid transparent' }
                    }
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* TAB RENDERS */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }}></div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading setup statistics...</p>
              </div>
            ) : (
              <>
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'OVERVIEW' && (
                  <div className="space-y-3 animate-fade-in">
                    {/* STATS MATRIX */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* CARD 1 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Net P&L</span>
                        <div className="text-2xl font-extrabold font-mono mt-1.5" style={{ color: overviewStats.netPnl >= 0 ? '#008F67' : '#DF1C30' }}>
                          {formatCurrency(overviewStats.netPnl)}
                        </div>
                      </div>

                      {/* CARD 2 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Trades</span>
                        <div className="text-2xl font-extrabold font-mono mt-1.5" style={{ color: 'var(--text)' }}>
                          {overviewStats.totalTrades}
                        </div>
                      </div>

                      {/* CARD 3 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Win Rate</span>
                        <div 
                          className={`text-2xl font-extrabold font-mono mt-1.5 ${
                            overviewStats.winRate >= 60 || overviewStats.winRate < 40 ? '' : 'text-amber-400'
                          }`}
                          style={
                            overviewStats.winRate >= 60 ? { color: '#008F67' } :
                            overviewStats.winRate < 40 ? { color: '#DF1C30' } :
                            undefined
                          }
                        >
                          {overviewStats.winRate.toFixed(1)}%
                        </div>
                      </div>

                      {/* CARD 4 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Profit Factor</span>
                        <div className="text-2xl font-extrabold font-mono mt-1.5" style={{ color: 'var(--text)' }}>
                          {typeof overviewStats.profitFactor === 'number' ? overviewStats.profitFactor.toFixed(2) : overviewStats.profitFactor}
                        </div>
                      </div>

                      {/* CARD 5 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Avg R-Multiple</span>
                        <div className="text-2xl font-extrabold font-mono mt-1.5" style={{ color: overviewStats.avgR >= 0 ? '#008F67' : '#DF1C30' }}>
                          {overviewStats.avgR >= 0 ? '+' : ''}{overviewStats.avgR.toFixed(2)}R
                        </div>
                      </div>

                      {/* CARD 6 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Expectancy</span>
                        <div className="text-2xl font-extrabold font-mono mt-1.5" style={{ color: overviewStats.expectancy >= 0 ? '#008F67' : '#DF1C30' }}>
                          {formatCurrency(overviewStats.expectancy)}
                        </div>
                      </div>

                      {/* CARD 7 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Avg Winner</span>
                        <div className="text-2xl font-extrabold font-mono mt-1.5" style={{ color: '#008F67' }}>
                          {formatCurrency(overviewStats.avgWinner)}
                        </div>
                      </div>

                      {/* CARD 8 */}
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Avg Loser</span>
                        <div className="text-2xl font-extrabold font-mono mt-1.5" style={{ color: '#DF1C30' }}>
                          {formatCurrency(overviewStats.avgLoser)}
                        </div>
                      </div>
                    </div>

                    {/* CHARTS GRAPH COMPONENT */}
                    <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                      <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-5">
                        Cumulative P&L — {strategy?.name || 'Strategy'}
                      </h3>

                      {chartDetails.data.length <= 1 ? (
                        <div className="h-[286px] flex flex-col items-center justify-center text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          <TrendingUp className="w-8 h-8 text-zinc-600 mb-2" />
                          No trades logged with this strategy to compute curve.
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: 286 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={chartDetails.data}
                              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                            >
                              <defs>
                                <linearGradient id="stratAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#008F67" stopOpacity={0.40} />
                                  <stop offset={`${chartDetails.zeroPercent}%`} stopColor="#008F67" stopOpacity={0.00} />
                                  <stop offset={`${chartDetails.zeroPercent}%`} stopColor="#DF1C30" stopOpacity={0.00} />
                                  <stop offset="100%" stopColor="#DF1C30" stopOpacity={0.40} />
                                </linearGradient>
                                <linearGradient id="stratLineGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#008F67" stopOpacity={1} />
                                  <stop offset={`${chartDetails.zeroPercent}%`} stopColor="#008F67" stopOpacity={1} />
                                  <stop offset={`${chartDetails.zeroPercent}%`} stopColor="#DF1C30" stopOpacity={1} />
                                  <stop offset="100%" stopColor="#DF1C30" stopOpacity={1} />
                                </linearGradient>
                              </defs>

                              <XAxis
                                dataKey="dateLabel"
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={{ stroke: 'var(--border)' }}
                              />
                              <YAxis
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`}
                                width={85}
                              />
                              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: 'var(--card)',
                                  border: '0.5px solid var(--border)',
                                  borderRadius: '12px',
                                  color: 'var(--text)'
                                }}
                                formatter={(value: any) => [
                                  <span key="val" className="font-bold" style={{ color: Number(value) >= 0 ? '#008F67' : '#DF1C30' }}>
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
                                      fill={val >= 0 ? '#008F67' : '#DF1C30'}
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
                        <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>{entryRulesPerf.length} active rules</span>
                      </div>

                      {entryRulesPerf.length === 0 ? (
                        <div className="p-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          No entry rules specified for this strategy.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="border-b text-[10px] font-mono font-bold uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
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
                                let followClass = '';
                                let followStyle: React.CSSProperties = {};
                                if (r.followRate !== null) {
                                  if (r.followRate >= 80) {
                                    followStyle = { color: '#008F67' };
                                  } else if (r.followRate >= 50) {
                                    followClass = 'text-amber-400';
                                  } else {
                                    followStyle = { color: '#DF1C30' };
                                  }
                                } else {
                                  followStyle = { color: '#DF1C30' };
                                }

                                return (
                                  <tr key={r.id} className="border-b hover:bg-zinc-800/10 transition-colors" style={{ borderColor: 'var(--border)' }}>
                                    <td className="py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text)' }}>{r.rule_text}</td>
                                    <td className={`py-3 px-4 text-center text-xs font-mono font-bold ${followClass}`} style={followStyle}>
                                      {r.followRate !== null ? `${r.followRate.toFixed(1)}%` : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-right text-xs font-mono font-bold" style={{ color: r.pnlFollowed !== null && r.pnlFollowed >= 0 ? '#008F67' : '#DF1C30' }}>
                                      {r.pnlFollowed !== null ? formatCurrency(r.pnlFollowed) : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-right text-xs font-mono font-bold" style={{ color: r.pnlNotFollowed !== null && r.pnlNotFollowed >= 0 ? '#008F67' : '#DF1C30' }}>
                                      {r.pnlNotFollowed !== null ? formatCurrency(r.pnlNotFollowed) : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-center text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>
                                      {r.winRateFollowed !== null ? `${r.winRateFollowed.toFixed(1)}%` : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-center text-xs font-mono" style={{ color: 'var(--text-sub)' }}>{r.evaluationCount}</td>
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
                        <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>{exitRulesPerf.length} active rules</span>
                      </div>

                      {exitRulesPerf.length === 0 ? (
                        <div className="p-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          No exit rules specified for this strategy.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="border-b text-[10px] font-mono font-bold uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
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
                                let followClass = '';
                                let followStyle: React.CSSProperties = {};
                                if (r.followRate !== null) {
                                  if (r.followRate >= 80) {
                                    followStyle = { color: '#008F67' };
                                  } else if (r.followRate >= 50) {
                                    followClass = 'text-amber-400';
                                  } else {
                                    followStyle = { color: '#DF1C30' };
                                  }
                                } else {
                                  followStyle = { color: '#DF1C30' };
                                }

                                return (
                                  <tr key={r.id} className="border-b hover:bg-zinc-800/10 transition-colors" style={{ borderColor: 'var(--border)' }}>
                                    <td className="py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text)' }}>{r.rule_text}</td>
                                    <td className={`py-3 px-4 text-center text-xs font-mono font-bold ${followClass}`} style={followStyle}>
                                      {r.followRate !== null ? `${r.followRate.toFixed(1)}%` : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-right text-xs font-mono font-bold" style={{ color: r.pnlFollowed !== null && r.pnlFollowed >= 0 ? '#008F67' : '#DF1C30' }}>
                                      {r.pnlFollowed !== null ? formatCurrency(r.pnlFollowed) : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-right text-xs font-mono font-bold" style={{ color: r.pnlNotFollowed !== null && r.pnlNotFollowed >= 0 ? '#008F67' : '#DF1C30' }}>
                                      {r.pnlNotFollowed !== null ? formatCurrency(r.pnlNotFollowed) : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-center text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>
                                      {r.winRateFollowed !== null ? `${r.winRateFollowed.toFixed(1)}%` : '--'}
                                    </td>
                                    <td className="py-3 px-4 text-center text-xs font-mono" style={{ color: 'var(--text-sub)' }}>{r.evaluationCount}</td>
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
                        <div className="p-12 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          No trades logged with this setup yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto animate-fade-in_short">
                          <table className="w-full text-left border-collapse min-w-[750px]">
                            <thead>
                              <tr className="border-b text-[10px] font-mono font-bold uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
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
                                    <td className="py-3.5 px-4 text-xs font-mono" style={{ color: 'var(--text-sub)' }}>{t.date}</td>
                                    <td className="py-3.5 px-4 font-bold text-sm tracking-tight" style={{ color: 'var(--text)' }}>{t.symbol}</td>
                                    <td className="py-3.5 px-4">
                                      <span 
                                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                        style={
                                          t.direction.toUpperCase() === 'LONG' || t.direction.toUpperCase() === 'BUY'
                                            ? { backgroundColor: 'rgba(0,143,103,0.1)', color: '#008F67' }
                                            : { backgroundColor: 'rgba(223,28,48,0.1)', color: '#DF1C30' }
                                        }
                                      >
                                        {dirOpt}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-right text-xs font-mono font-bold" style={{ color: t.pnl && t.pnl >= 0 ? '#008F67' : '#DF1C30' }}>
                                      {t.pnl !== null ? formatCurrency(t.pnl) : '₹0'}
                                    </td>
                                    <td className="py-3.5 px-4 text-center text-xs font-mono font-bold" style={{ color: t.r_multiple && t.r_multiple >= 0 ? '#008F67' : '#DF1C30' }}>
                                      {t.r_multiple !== null ? `${t.r_multiple >= 0 ? '+' : ''}${t.r_multiple.toFixed(2)}R` : '--'}
                                    </td>
                                    <td className="py-3.5 px-4 text-center text-xs">
                                      <span 
                                        className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border"
                                        style={
                                          t.status === 'Win' ? { backgroundColor: 'rgba(0,143,103,0.1)', color: '#008F67', borderColor: 'rgba(0,143,103,0.2)' } :
                                          t.status === 'Loss' ? { backgroundColor: 'rgba(223,28,48,0.1)', color: '#DF1C30', borderColor: 'rgba(223,28,48,0.2)' } :
                                          { backgroundColor: 'var(--bar)', color: 'var(--text-sub)', borderColor: 'var(--border)' }
                                        }
                                      >
                                        {t.status}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-xs font-semibold capitalize" style={{ color: 'var(--text-sub)' }}>{t.execution_status || '--'}</td>
                                    <td className="py-3.5 px-4 text-xs font-mono" style={{ color: 'var(--text-sub)' }}>{t.holding_time_mins ? `${t.holding_time_mins} mins` : '--'}</td>
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
                          className="px-3.5 py-1.5 text-xs font-bold uppercase rounded-lg border border-[#2c2d3c] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors inline-flex items-center gap-1"
                          style={{ color: 'var(--text-sub)' }}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Prev
                        </button>

                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          Page <strong style={{ color: 'var(--text-sub)' }}>{tradePage}</strong> of <strong style={{ color: 'var(--text-sub)' }}>{totalTradePages}</strong>
                        </span>

                        <button
                          disabled={tradePage === totalTradePages}
                          onClick={() => setTradePage(prev => Math.min(prev + 1, totalTradePages))}
                          className="px-3.5 py-1.5 text-xs font-bold uppercase rounded-lg border border-[#2c2d3c] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors inline-flex items-center gap-1"
                          style={{ color: 'var(--text-sub)' }}
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
                  <div className="space-y-6 animate-fade-in">
                    {/* Top Header & Stats Section */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                        {/* CARD 1 */}
                        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Missed</span>
                          <span className="text-2xl font-bold font-sans mt-1.5" style={{ color: 'var(--text)' }}>{missedTradesStats.totalMissed}</span>
                        </div>
                        {/* CARD 2 */}
                        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Potential P&L</span>
                          <span className="text-2xl font-bold font-sans mt-1.5" style={{ color: missedTradesStats.potentialPnlSum >= 0 ? '#008F67' : '#DF1C30' }}>
                            {formatCurrency(missedTradesStats.potentialPnlSum)}
                          </span>
                        </div>
                        {/* CARD 3 */}
                        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Avg Potential</span>
                          <span className="text-2xl font-bold font-sans mt-1.5" style={{ color: missedTradesStats.avgPotential >= 0 ? '#008F67' : '#DF1C30' }}>
                            {formatCurrency(missedTradesStats.avgPotential)}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-end items-center self-end lg:self-center">
                        <button
                          onClick={() => setAddModalOpen(true)}
                          className="px-4 py-2.5 rounded-lg text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
                          style={{ backgroundColor: 'var(--accent)' }}
                        >
                          <Plus className="w-4 h-4" />
                          Log Missed Trade
                        </button>
                      </div>
                    </div>

                    {/* Missed Trades Table or Empty State */}
                    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                      {missedTrades.length === 0 ? (
                        <div className="py-16 text-center px-4">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-sub)' }}>No missed trades logged for this strategy.</p>
                          <p className="text-xs mt-1.5 max-w-sm mx-auto leading-relaxed font-sans" style={{ color: 'var(--text-muted)' }}>
                            Log trades you missed to analyze opportunity costs and improve discipline.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b font-mono text-[10px] uppercase tracking-wider" style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(255,255,255,0.01)', color: 'var(--text-muted)' }}>
                                <th className="py-3.5 px-4 font-bold">Date</th>
                                <th className="py-3.5 px-4 font-bold">Symbol</th>
                                <th className="py-3.5 px-4 font-bold">Direction</th>
                                <th className="py-3.5 px-4 font-bold text-right">Potential P&L</th>
                                <th className="py-3.5 px-4 font-bold">Notes</th>
                                <th className="py-3.5 px-4 font-bold text-center w-20">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                              {missedTrades.map((mt) => {
                                const isLong = mt.direction === 'LONG';
                                return (
                                  <tr
                                    key={mt.id}
                                    className="hover:bg-zinc-800/10 transition-colors"
                                  >
                                    <td className="py-3.5 px-4 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                      {formatDateCustom(mt.date)}
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-sm tracking-tight uppercase" style={{ color: 'var(--text)' }}>
                                      {mt.symbol}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span 
                                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                                        style={
                                          isLong
                                            ? { backgroundColor: 'rgba(0,143,103,0.1)', color: '#008F67', borderColor: 'rgba(0,143,103,0.2)' }
                                            : { backgroundColor: 'rgba(223,28,48,0.1)', color: '#DF1C30', borderColor: 'rgba(223,28,48,0.2)' }
                                        }
                                      >
                                        {mt.direction}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-right text-xs font-mono font-bold" style={{ color: mt.potential_pnl !== null && mt.potential_pnl !== undefined ? (mt.potential_pnl >= 0 ? '#008F67' : '#DF1C30') : 'var(--text-muted)' }}>
                                      {mt.potential_pnl !== null && mt.potential_pnl !== undefined ? formatCurrency(mt.potential_pnl) : '--'}
                                    </td>
                                    <td className="py-3.5 px-4 text-xs max-w-xs truncate" style={{ color: 'var(--text-sub)' }} title={mt.notes || ''}>
                                      {mt.notes || '--'}
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                      <button
                                        onClick={(e) => {
                                          if (confirm("Are you sure you want to delete this missed trade?")) {
                                            handleDeleteMissedTrade(mt.id, e);
                                          }
                                        }}
                                        className="p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                        style={{ color: 'var(--text-muted)' }}
                                        title="Delete missed trade"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* ADD MISSED TRADE MODAL */}
                    {addModalOpen && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop overlay */}
                        <div 
                          className="absolute inset-0 bg-black/40 backdrop-blur-xs" 
                          onClick={() => setAddModalOpen(false)}
                        />
                        
                        {/* Modal Box */}
                        <div 
                          className="relative w-full max-w-[480px] rounded-2xl border p-6 z-10 shadow-2xl animate-scale-in"
                          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text)' }}>Log Missed Trade</h3>
                            <button 
                              onClick={() => setAddModalOpen(false)}
                              className="p-1.5 rounded-lg transition-colors cursor-pointer"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <form onSubmit={handleSaveMissedTrade} className="space-y-4">
                            {/* Date field */}
                            <div>
                              <label htmlFor="mt-date" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                                Date <span style={{ color: 'var(--accent)' }}>*</span>
                              </label>
                              <input
                                id="mt-date"
                                type="date"
                                required
                                value={mtDate}
                                onChange={(e) => setMtDate(e.target.value)}
                                className="w-full rounded-lg border px-3.5 py-2 text-sm font-sans placeholder-zinc-500 transition-colors focus:outline-none focus:border-cyan-500"
                                style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'var(--border)', color: 'var(--text)' }}
                              />
                            </div>

                            {/* Symbol field */}
                            <div className="relative" ref={mtSymbolContainerRef}>
                              <label htmlFor="mt-symbol" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                                Symbol <span style={{ color: 'var(--accent)' }}>*</span>
                              </label>
                              <input
                                id="mt-symbol"
                                type="text"
                                required
                                autoComplete="off"
                                placeholder="e.g. EURUSD, NIFTY..."
                                value={mtSymbol}
                                onChange={(e) => {
                                  setMtSymbol(e.target.value);
                                  setShowMtSuggestions(true);
                                }}
                                onFocus={() => setShowMtSuggestions(true)}
                                className="w-full rounded-lg border px-3.5 py-2 text-sm font-sans placeholder-zinc-500 transition-colors focus:outline-none focus:border-cyan-500 uppercase"
                                style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'var(--border)', color: 'var(--text)' }}
                              />

                              {/* Autocomplete suggestions dropdown */}
                              {showMtSuggestions && mtSuggestions.length > 0 && (
                                <div 
                                  className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border z-50 shadow-xl text-xs" 
                                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                                >
                                  {mtSuggestions.map((sym) => (
                                    <button
                                      key={sym}
                                      type="button"
                                      onClick={() => {
                                        setMtSymbol(sym);
                                        setShowMtSuggestions(false);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-zinc-805 transition-colors cursor-pointer"
                                      style={{ color: 'var(--text-sub)' }}
                                    >
                                      {sym}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Direction field */}
                            <div>
                              <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                                Direction <span style={{ color: 'var(--accent)' }}>*</span>
                              </label>
                              <div className="grid grid-cols-2 gap-2 font-sans">
                                {(['LONG', 'SHORT'] as const).map((dir) => {
                                  const isSel = mtDirection === dir;
                                  
                                  const defaultStyle = {
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-sub)'
                                  };

                                  const activeStyle = dir === 'LONG' ? {
                                    backgroundColor: 'rgba(0,143,103,0.12)',
                                    border: '1.5px solid #008F67',
                                    color: '#008F67'
                                  } : {
                                    backgroundColor: 'rgba(223,28,48,0.12)',
                                    border: '1.5px solid #DF1C30',
                                    color: '#DF1C30'
                                  };

                                  return (
                                    <button
                                      key={dir}
                                      type="button"
                                      onClick={() => setMtDirection(dir)}
                                      style={isSel ? activeStyle : defaultStyle}
                                      className="rounded-lg py-2 px-4 text-xs font-semibold text-center cursor-pointer transition-all border"
                                    >
                                      {dir}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Potential P&L field */}
                            <div>
                              <label htmlFor="mt-potential-pnl" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                                Potential P&L (₹, Optional)
                              </label>
                              <input
                                id="mt-potential-pnl"
                                type="number"
                                step="any"
                                placeholder="e.g. 5000 or -2500"
                                value={mtPotentialPnl}
                                onChange={(e) => setMtPotentialPnl(e.target.value)}
                                className="w-full rounded-lg border px-3.5 py-2 text-sm font-sans placeholder-zinc-500 transition-colors focus:outline-none focus:border-cyan-500"
                                style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'var(--border)', color: 'var(--text)' }}
                              />
                            </div>

                            {/* Notes field */}
                            <div>
                              <label htmlFor="mt-notes" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                                Notes (Optional)
                              </label>
                              <textarea
                                id="mt-notes"
                                placeholder="Describe setup details, why you missed it, or what patterns you noticed..."
                                rows={3}
                                value={mtNotes}
                                onChange={(e) => setMtNotes(e.target.value)}
                                className="w-full rounded-lg border px-3.5 py-2 text-sm font-sans placeholder-zinc-500 transition-colors focus:outline-none focus:border-cyan-500 leading-relaxed"
                                style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'var(--border)', color: 'var(--text)' }}
                              />
                            </div>

                            {/* Form actions */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                              <button
                                type="button"
                                onClick={() => setAddModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold rounded-lg border transition-all hover:bg-zinc-800 cursor-pointer"
                                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                                style={{ backgroundColor: 'var(--accent)' }}
                              >
                                Save Missed Trade
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: NOTES */}
                {activeTab === 'NOTES' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between mb-3.5">
                        <label htmlFor="strategy-notes-area" className="text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                          <FileText className="w-4 h-4" />
                          Strategy Notes
                        </label>
                        {saveFeedback && (
                          <span 
                            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                              saveFeedback.includes('Saved') ? '' : 'text-amber-400 bg-amber-500/10'
                            }`}
                            style={
                              saveFeedback.includes('Saved')
                                ? { backgroundColor: 'rgba(0,143,103,0.1)', color: '#008F67' }
                                : undefined
                            }
                          >
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
                        className="w-full rounded-xl border p-4 font-sans text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed"
                        style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 6: REFERENCE */}
                {activeTab === 'REFERENCE' && (
                  <div className="space-y-4 animate-fade-in">
                    {(() => {
                      const referenceImages = strategy && Array.isArray(strategy.reference_images)
                        ? strategy.reference_images.filter(Boolean)
                        : [];

                      if (referenceImages.length === 0) {
                        return (
                          <div
                            className="flex flex-col items-center justify-center p-12 py-20 text-center rounded-2xl border"
                            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                          >
                            <div className="p-4 rounded-full mb-4" style={{ backgroundColor: 'var(--bar)', color: 'var(--text-muted)' }}>
                              <Image className="w-8 h-8" />
                            </div>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-sub)' }}>No reference images yet</h3>
                            <p className="text-xs mt-1.5 max-w-sm leading-relaxed font-sans" style={{ color: 'var(--text-muted)' }}>
                              Add reference images when editing this strategy to see them here.
                            </p>
                            <Link
                              to={`/strategies/${strategyId}/edit`}
                              className="mt-5 px-4 py-2 rounded-lg text-white font-medium text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer inline-flex items-center"
                              style={{ backgroundColor: 'var(--accent)' }}
                            >
                              Edit Strategy
                            </Link>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4 font-sans">
                          {/* Image Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[12px]">
                            {referenceImages.map((imgUrl, index) => (
                              <div
                                key={index}
                                onClick={() => setLightboxIndex(index)}
                                className="relative aspect-[4/3] rounded-[8px] overflow-hidden cursor-pointer hover:opacity-90 hover:scale-[1.01] transition-all group border shadow-sm"
                                style={{
                                  border: '0.5px solid var(--border)',
                                  backgroundColor: 'var(--bar)'
                                }}
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Playbook screenshot ${index + 1}`}
                                  className="w-full h-full object-cover rounded-[8px]"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center animate-fade-in">
                                  <span className="text-[11px] font-mono font-medium px-2 py-1 rounded text-white" style={{ backgroundColor: 'var(--card)' }}>
                                    View Maximized
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Image Count Footer */}
                          <p className="text-xs font-mono mt-3" style={{ color: 'var(--text-muted)' }}>
                            {referenceImages.length} reference image{referenceImages.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* FULLSCREEN LIGHTBOX OVERLAY */}
      {lightboxIndex !== null && (() => {
        const referenceImages = strategy && Array.isArray(strategy.reference_images)
          ? strategy.reference_images.filter(Boolean)
          : [];
        const currentImgUrl = referenceImages[lightboxIndex];
        if (!currentImgUrl) return null;

        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close button (×) */}
            <button
              onClick={() => setLightboxIndex(null)}
              style={{
                position: 'fixed',
                top: '20px',
                right: '24px',
                zIndex: 10000,
                fontSize: '28px',
                color: 'white',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                outline: 'none'
              }}
            >
              &times;
            </button>

            {/* Prev Arrow */}
            {referenceImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevImage();
                }}
                style={{
                  position: 'fixed',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10000,
                  left: '20px',
                  color: 'white',
                  fontSize: '32px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft style={{ width: '32px', height: '32px' }} />
              </button>
            )}

            {/* Image Display */}
            <div onClick={(e) => e.stopPropagation()}>
              <img
                src={currentImgUrl}
                alt={`Reference image ${lightboxIndex + 1}`}
                style={{
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Next Arrow */}
            {referenceImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
                style={{
                  position: 'fixed',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10000,
                  right: '20px',
                  color: 'white',
                  fontSize: '32px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <ChevronRight style={{ width: '32px', height: '32px' }} />
              </button>
            )}

            {/* Image counter (e.g. "2 / 5") */}
            <div
              style={{
                position: 'fixed',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                fontSize: '13px',
                zIndex: 10000
              }}
            >
              {lightboxIndex + 1} / {referenceImages.length}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
export default StrategyDetail;
