import React, { useState, useEffect, Component, useRef } from 'react';
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
  Sparkles,
  CheckCircle2,
  Check,
  ChevronDown
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Trade } from '../types';
import { generateEmbeddingFromUrl } from '../lib/clipEmbedder';
import TradeChart from '../components/TradeChart';
import ChartImageViewer from '../components/ChartImageViewer';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("TradeTrackingPage crash captured by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
          <div className="p-6 rounded-2xl max-w-md w-full text-center shadow-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500" style={{ backgroundColor: 'var(--row)', border: '1px solid var(--border)' }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>Something went wrong</h2>
            <p className="text-xs mt-2 mb-6 leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              An unexpected error occurred while rendering the trade analytics view. Let's try again or return to your dashboard.
            </p>
            {this.state.error?.message && (
              <div className="rounded-xl p-3 text-left font-mono text-[10px] text-red-500 overflow-x-auto mb-6" style={{ backgroundColor: 'var(--bar)', border: '1px solid var(--border)' }}>
                <strong>Error:</strong> {this.state.error.message}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="font-semibold rounded-xl px-4 py-2.5 text-xs transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
              >
                Reload Page
              </button>
              <a
                href="/trading-logs"
                className="transition-colors font-semibold rounded-xl px-4 py-2.5 text-xs"
                style={{ backgroundColor: 'var(--bar)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                Back to Logs
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const TradeTrackingPageContent: React.FC = () => {
  const { id: tradeId } = useParams<{ id: string }>();
  const { user, userId, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const userTheme = localStorage.getItem('tl-theme') || 'warm';

  // Primary Data States
  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [trade, setTrade] = useState<any>(null);
  const [entryRules, setEntryRules] = useState<any[]>([]);
  const [exitRules, setExitRules] = useState<any[]>([]);
  const [psychology, setPsychology] = useState<any>(null);
  const [riskMgmt, setRiskMgmt] = useState<any>(null);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // CHANGE 1 — Previous Trade / Next Trade navigation state
  const [orderedTradeIds, setOrderedTradeIds] = useState<string[]>([]);

  // CHANGE 2 — Tabs State
  const [activeTab, setActiveTab] = useState<'stats' | 'playbooks' | 'market'>('stats');

  // Strategies list state for dropdown selection
  const [strategiesList, setStrategiesList] = useState<any[]>([]);
  const [isSetupDropdownOpen, setIsSetupDropdownOpen] = useState(false);
  const [activeSetupIndex, setActiveSetupIndex] = useState(0);
  const setupDropdownRef = useRef<HTMLDivElement>(null);

  const [isExecStatusOpen, setIsExecStatusOpen] = useState(false);
  const [activeExecStatusIndex, setActiveExecStatusIndex] = useState(0);
  const execStatusRef = useRef<HTMLDivElement>(null);

  const [isMistakeTypeOpen, setIsMistakeTypeOpen] = useState(false);
  const [activeMistakeTypeIndex, setActiveMistakeTypeIndex] = useState(0);
  const mistakeTypeRef = useRef<HTMLDivElement>(null);

  const [isMistakeTextOpen, setIsMistakeTextOpen] = useState(false);
  const [activeMistakeTextIndex, setActiveMistakeTextIndex] = useState(0);
  const mistakeTextRef = useRef<HTMLDivElement>(null);

  const [isPhaseOpen, setIsPhaseOpen] = useState(false);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const phaseRef = useRef<HTMLDivElement>(null);

  const [isTrendOpen, setIsTrendOpen] = useState(false);
  const [activeTrendIndex, setActiveTrendIndex] = useState(0);
  const trendRef = useRef<HTMLDivElement>(null);

  const [isOpeningOpen, setIsOpeningOpen] = useState(false);
  const [activeOpeningIndex, setActiveOpeningIndex] = useState(0);
  const openingRef = useRef<HTMLDivElement>(null);

  const [isHourlyOpen, setIsHourlyOpen] = useState(false);
  const [activeHourlyIndex, setActiveHourlyIndex] = useState(0);
  const hourlyRef = useRef<HTMLDivElement>(null);

  const PHASE_OPTIONS = ['Accumulation', 'Manipulation', 'Distribution'];
  const TREND_OPTIONS = ['Trend Starting', 'Trend Middle', 'Trend Ending', 'Ranging'];
  const OPENING_OPTIONS = ['London Open', 'NY Open', 'Asian Session', 'Killzone', 'Pre-Market', 'Mid-Day', 'Other'];
  const HOURLY_OPTIONS = ['UP', 'DOWN', 'CONSOLIDATION'];
  const HOURLY_DISPLAY_LABELS: Record<string, string> = { UP: 'UP', DOWN: 'DOWN', CONSOLIDATION: 'BE/RNG' };

  const EXEC_STATUS_OPTIONS = ['BEST TRADE', 'GOOD TRADE', 'AVERAGE TRADE', 'POOR TRADE', 'BAD TRADE'];
  const MISTAKE_TYPE_OPTIONS = ['Technical', 'Psychological', 'Risk Management', 'No Mistake'];
  const MISTAKE_TEXT_OPTIONS: Record<string, string[]> = {
    'Technical': ['Early Exit', 'Exit without reason', 'Ignoring price action', 'OB Ignoring & very tight SL', 'Taking trade against the bias', 'Without setup entry', 'Wrong entry point', 'Wrong SL calculation'],
    'Psychological': ['Without setup entry (emotional override)', 'Exit without reason (fear-based)', 'Taking trade against the bias (FOMO)', 'Revenge trade after loss'],
    'Risk Management': ['Small quantity (undersized)', 'Very close SL', 'Wrong SL calculation', 'Oversized position'],
  };

  useEffect(() => {
    const fetchStrategiesList = async () => {
      const { data, error } = await supabase
        .from('strategies')
        .select('id, name, sr_no, type_of_strategy')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('sr_no', { ascending: true });
      if (!error) setStrategiesList(data || []);
    };
    if (userId) fetchStrategiesList();
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (setupDropdownRef.current && !setupDropdownRef.current.contains(e.target as Node)) {
        setIsSetupDropdownOpen(false);
      }
      if (execStatusRef.current && !execStatusRef.current.contains(e.target as Node)) {
        setIsExecStatusOpen(false);
      }
      if (mistakeTypeRef.current && !mistakeTypeRef.current.contains(e.target as Node)) {
        setIsMistakeTypeOpen(false);
      }
      if (mistakeTextRef.current && !mistakeTextRef.current.contains(e.target as Node)) {
        setIsMistakeTextOpen(false);
      }
      if (phaseRef.current && !phaseRef.current.contains(e.target as Node)) {
        setIsPhaseOpen(false);
      }
      if (trendRef.current && !trendRef.current.contains(e.target as Node)) {
        setIsTrendOpen(false);
      }
      if (openingRef.current && !openingRef.current.contains(e.target as Node)) {
        setIsOpeningOpen(false);
      }
      if (hourlyRef.current && !hourlyRef.current.contains(e.target as Node)) {
        setIsHourlyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // CHANGE 3 — Form states
  const [profitTarget, setProfitTarget] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [maeValue, setMaeValue] = useState<string>('');
  const [mfeValue, setMfeValue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // CHANGE 4 — Running P&L state
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<boolean>(false);

  // Fetch ordered trade IDs for user
  useEffect(() => {
    const fetchAllTradeIds = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('id')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          setOrderedTradeIds(data.map((t: any) => t.id));
        }
      } catch (err) {
        console.error('Error fetching trade IDs:', err);
      }
    };
    fetchAllTradeIds();
  }, [userId]);

  const currentIndex = orderedTradeIds.indexOf(tradeId || '');
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < orderedTradeIds.length - 1;

  const handlePrevTrade = () => {
    if (hasPrevious) {
      navigate(`/trading-logs/${orderedTradeIds[currentIndex - 1]}`);
    }
  };

  const handleNextTrade = () => {
    if (hasNext) {
      navigate(`/trading-logs/${orderedTradeIds[currentIndex + 1]}`);
    }
  };

  // Sync inputs on trade edit changes
  useEffect(() => {
    if (trade) {
      setProfitTarget(trade.profit_target !== null && trade.profit_target !== undefined ? String(trade.profit_target) : '');
      setStopLossPrice(trade.stop_loss_price !== null && trade.stop_loss_price !== undefined ? String(trade.stop_loss_price) : '');
      setMaeValue(trade.mae !== null && trade.mae !== undefined ? String(trade.mae) : '');
      setMfeValue(trade.mfe !== null && trade.mfe !== undefined ? String(trade.mfe) : '');
      setNotes(trade.notes || '');
    }
  }, [trade]);

  // Save fields on Blur
  const handleBlurProfitTarget = async () => {
    if (!userId || !tradeId) return;
    const numPT = profitTarget === '' ? null : parseFloat(profitTarget);
    
    try {
      const { error } = await supabase
        .from('trades')
        .update({ 
          profit_target: numPT
        })
        .eq('id', tradeId)
        .eq('user_id', userId);
      if (error) throw error;
      
      setTrade((prev: any) => ({
        ...prev,
        profit_target: numPT
      }));
    } catch (err) {
      console.error('Error saving profit target:', err);
      showError('Failed to save Profit Target.');
    }
  };

  const handleBlurStopLossPrice = async () => {
    if (!userId || !tradeId) return;
    const numSL = stopLossPrice === '' ? null : parseFloat(stopLossPrice);
    
    try {
      const { error } = await supabase
        .from('trades')
        .update({ 
          stop_loss_price: numSL
        })
        .eq('id', tradeId)
        .eq('user_id', userId);
      if (error) throw error;
      
      setTrade((prev: any) => ({
        ...prev,
        stop_loss_price: numSL
      }));
    } catch (err) {
      console.error('Error saving stop loss:', err);
      showError('Failed to save Stop Loss.');
    }
  };

  const handleBlurMae = async () => {
    if (!userId || !tradeId) return;
    const numMae = maeValue === '' ? null : parseFloat(maeValue);
    try {
      const { error } = await supabase
        .from('trades')
        .update({ mae: numMae })
        .eq('id', tradeId)
        .eq('user_id', userId);
      if (error) throw error;
      
      setTrade((prev: any) => ({
        ...prev,
        mae: numMae
      }));
    } catch (err) {
      console.error('Error saving MAE:', err);
      showError('Failed to save MAE.');
    }
  };

  const handleBlurMfe = async () => {
    if (!userId || !tradeId) return;
    const numMfe = mfeValue === '' ? null : parseFloat(mfeValue);
    try {
      const { error } = await supabase
        .from('trades')
        .update({ mfe: numMfe })
        .eq('id', tradeId)
        .eq('user_id', userId);
      if (error) throw error;
      
      setTrade((prev: any) => ({
        ...prev,
        mfe: numMfe
      }));
    } catch (err) {
      console.error('Error saving MFE:', err);
      showError('Failed to save MFE.');
    }
  };

  const handleBlurNotes = async () => {
    if (!userId || !tradeId) return;
    try {
      const { error } = await supabase
        .from('trades')
        .update({ notes: notes.trim() || null })
        .eq('id', tradeId)
        .eq('user_id', userId);
      if (error) throw error;
      setTrade((prev: any) => ({ ...prev, notes: notes.trim() || null }));
    } catch (err) {
      console.error('Error saving notes:', err);
      showError('Failed to save Notes.');
    }
  };

  // Planned R-Multiple auto-calculated read-only formula
  const calculatedPlannedR = React.useMemo(() => {
    return '—';
  }, []);

  const handleStrategyChange = async (newStrategyId: string) => {
    try {
      const { error: tradeError } = await supabase
        .from('trades')
        .update({ strategy_id: newStrategyId || null })
        .eq('id', tradeId)
        .eq('user_id', userId);
      if (tradeError) throw tradeError;

      await supabase
        .from('trade_rule_adherence')
        .delete()
        .eq('trade_id', tradeId)
        .eq('user_id', userId);

      let newRules: any[] = [];
      if (newStrategyId) {
        const { data: rulesData, error: rulesFetchError } = await supabase
          .from('strategy_rules')
          .select('*')
          .eq('strategy_id', newStrategyId)
          .eq('user_id', userId)
          .order('rule_type')
          .order('rule_order', { ascending: true });
        if (rulesFetchError) throw rulesFetchError;
        newRules = rulesData || [];
      }

      const allRulesToLog = newRules.map((r: any) => ({
        trade_id: tradeId,
        user_id: userId,
        date: trade?.date,
        rule_id: r.id,
        rule_type: r.rule_type,
        rule_order: r.rule_order,
        rule_text: r.rule_text,
        followed: false,
      }));

      let insertedRules: any[] = [];
      if (allRulesToLog.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('trade_rule_adherence')
          .insert(allRulesToLog)
          .select();
        if (insertError) {
          console.error('Rules logging failed:', insertError);
        } else {
          insertedRules = insertedData || [];
        }
      }

      const selectedStrategy = strategiesList.find((s) => s.id === newStrategyId);
      setTrade((prev: any) => ({
        ...prev,
        strategy_id: newStrategyId || null,
        strategies: selectedStrategy ? { name: selectedStrategy.name, type_of_strategy: selectedStrategy.type_of_strategy } : null,
      }));
      setEntryRules(insertedRules.filter((r: any) => r.rule_type === 'entry'));
      setExitRules(insertedRules.filter((r: any) => r.rule_type === 'exit'));
      showSuccess('Strategy updated and rule checklist refreshed!');
    } catch (err) {
      console.error('Strategy switch failed:', err);
      showError('Failed to change trade strategy.');
    }
  };

  const handleSetupDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (!isSetupDropdownOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const currentIdx = strategiesList.findIndex((s) => s.id === trade?.strategy_id);
      setActiveSetupIndex(currentIdx >= 0 ? currentIdx : 0);
      setIsSetupDropdownOpen(true);
      return;
    }
    if (!isSetupDropdownOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSetupIndex((prev) => Math.min(prev + 1, strategiesList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSetupIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = strategiesList[activeSetupIndex];
      if (selected) handleStrategyChange(selected.id);
      setIsSetupDropdownOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSetupDropdownOpen(false);
    }
  };

  const handleExecStatusChange = async (newStatus: string) => {
    try {
      const dbValue = (newStatus === '' || newStatus === 'Add Tags') ? null : newStatus;
      const { error } = await supabase
        .from('trades')
        .update({ execution_status: dbValue })
        .eq('id', tradeId)
        .eq('user_id', userId);
      if (error) throw error;
      setTrade((prev: any) => ({ ...prev, execution_status: dbValue }));
      showSuccess('Execution status updated successfully!');
    } catch (err) {
      console.error('Error saving execution status:', err);
      showError('Failed to update execution status.');
    }
  };

  const handleMistakeTypeChange = async (newType: string) => {
    try {
      const dbValue = (newType === '' || newType === 'Add Tags') ? null : newType;
      const { error } = await supabase
        .from('trades')
        .update({ mistake_type: dbValue, mistake_text: null })
        .eq('id', tradeId)
        .eq('user_id', userId);
      if (error) throw error;
      setTrade((prev: any) => ({ ...prev, mistake_type: dbValue, mistake_text: null }));
      showSuccess('Mistake type updated successfully!');
    } catch (err) {
      console.error('Error saving mistake type:', err);
      showError('Failed to update mistake type.');
    }
  };

  const handleMistakeTextChange = async (newText: string) => {
    try {
      const dbValue = (newText === '' || newText === 'Add Tags') ? null : newText;
      const { error } = await supabase
        .from('trades')
        .update({ mistake_text: dbValue })
        .eq('id', tradeId)
        .eq('user_id', userId);
      if (error) throw error;
      setTrade((prev: any) => ({ ...prev, mistake_text: dbValue }));
      showSuccess('Actual mistake updated successfully!');
    } catch (err) {
      console.error('Error saving mistake text:', err);
      showError('Failed to update actual mistake.');
    }
  };

  const handleTradeRatingChange = async (newRating: number) => {
    try {
      const dbValue = newRating <= 0 ? null : newRating;
      const { error } = await supabase
        .from('trades')
        .update({ trade_rating: dbValue })
        .eq('id', tradeId)
        .eq('user_id', userId);
      if (error) throw error;
      setTrade((prev: any) => ({ ...prev, trade_rating: dbValue }));
      showSuccess('Trade rating updated successfully!');
    } catch (err) {
      console.error('Error saving trade rating:', err);
      showError('Failed to update trade rating.');
    }
  };

  const handlePhaseChange = async (val: string) => {
    const v = val || null;
    try {
      const { error } = await supabase.from('trades').update({ phase: v }).eq('id', tradeId).eq('user_id', userId);
      if (error) throw error;
      setTrade((prev: any) => ({ ...prev, phase: v }));
      showSuccess('Market phase updated successfully!');
    } catch (err) {
      console.error('Error saving phase:', err);
      showError('Failed to update market phase.');
    }
  };

  const handleTrendChange = async (val: string) => {
    const v = val || null;
    try {
      const { error } = await supabase.from('trades').update({ trend_position: v }).eq('id', tradeId).eq('user_id', userId);
      if (error) throw error;
      setTrade((prev: any) => ({ ...prev, trend_position: v }));
      showSuccess('Trend location updated successfully!');
    } catch (err) {
      console.error('Error saving trend position:', err);
      showError('Failed to update trend location.');
    }
  };

  const handleOpeningChange = async (val: string) => {
    const v = val || null;
    try {
      const { error } = await supabase.from('trades').update({ opening_condition: v }).eq('id', tradeId).eq('user_id', userId);
      if (error) throw error;
      setTrade((prev: any) => ({ ...prev, opening_condition: v }));
      showSuccess('Opening state updated successfully!');
    } catch (err) {
      console.error('Error saving opening condition:', err);
      showError('Failed to update opening state.');
    }
  };

  const handleHourlyChange = async (val: string) => {
    const v = val || null;
    try {
      const { error } = await supabase.from('trades').update({ hourly_trend: v }).eq('id', tradeId).eq('user_id', userId);
      if (error) throw error;
      setTrade((prev: any) => ({ ...prev, hourly_trend: v }));
      showSuccess('Hourly trend updated successfully!');
    } catch (err) {
      console.error('Error saving hourly trend:', err);
      showError('Failed to update hourly trend.');
    }
  };

  const handlePhaseKeyDown = (e: React.KeyboardEvent) => {
    const fullOptions = ['Add Tags', ...PHASE_OPTIONS];
    if (!isPhaseOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const currentIdx = fullOptions.indexOf(trade?.phase || 'Add Tags');
      setActivePhaseIndex(currentIdx >= 0 ? currentIdx : 0);
      setIsPhaseOpen(true);
      return;
    }
    if (!isPhaseOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivePhaseIndex((prev) => Math.min(prev + 1, fullOptions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivePhaseIndex((prev) => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const sel = fullOptions[activePhaseIndex]; handlePhaseChange(sel === 'Add Tags' ? '' : sel); setIsPhaseOpen(false); }
    else if (e.key === 'Escape') { e.preventDefault(); setIsPhaseOpen(false); }
  };

  const handleTrendKeyDown = (e: React.KeyboardEvent) => {
    const fullOptions = ['Add Tags', ...TREND_OPTIONS];
    if (!isTrendOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const currentIdx = fullOptions.indexOf(trade?.trend_position || 'Add Tags');
      setActiveTrendIndex(currentIdx >= 0 ? currentIdx : 0);
      setIsTrendOpen(true);
      return;
    }
    if (!isTrendOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveTrendIndex((prev) => Math.min(prev + 1, fullOptions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveTrendIndex((prev) => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const sel = fullOptions[activeTrendIndex]; handleTrendChange(sel === 'Add Tags' ? '' : sel); setIsTrendOpen(false); }
    else if (e.key === 'Escape') { e.preventDefault(); setIsTrendOpen(false); }
  };

  const handleOpeningKeyDown = (e: React.KeyboardEvent) => {
    const fullOptions = ['Add Tags', ...OPENING_OPTIONS];
    if (!isOpeningOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const currentIdx = fullOptions.indexOf(trade?.opening_condition || 'Add Tags');
      setActiveOpeningIndex(currentIdx >= 0 ? currentIdx : 0);
      setIsOpeningOpen(true);
      return;
    }
    if (!isOpeningOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveOpeningIndex((prev) => Math.min(prev + 1, fullOptions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveOpeningIndex((prev) => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const sel = fullOptions[activeOpeningIndex]; handleOpeningChange(sel === 'Add Tags' ? '' : sel); setIsOpeningOpen(false); }
    else if (e.key === 'Escape') { e.preventDefault(); setIsOpeningOpen(false); }
  };

  const handleHourlyKeyDown = (e: React.KeyboardEvent) => {
    const fullOptions = ['Add Tags', ...HOURLY_OPTIONS];
    if (!isHourlyOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const currentIdx = fullOptions.indexOf(trade?.hourly_trend || 'Add Tags');
      setActiveHourlyIndex(currentIdx >= 0 ? currentIdx : 0);
      setIsHourlyOpen(true);
      return;
    }
    if (!isHourlyOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveHourlyIndex((prev) => Math.min(prev + 1, fullOptions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveHourlyIndex((prev) => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const sel = fullOptions[activeHourlyIndex]; handleHourlyChange(sel === 'Add Tags' ? '' : sel); setIsHourlyOpen(false); }
    else if (e.key === 'Escape') { e.preventDefault(); setIsHourlyOpen(false); }
  };

  const handleExecStatusKeyDown = (e: React.KeyboardEvent) => {
    const fullOptions = ['Add Tags', ...EXEC_STATUS_OPTIONS];
    if (!isExecStatusOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const currentIdx = fullOptions.indexOf(trade?.execution_status || 'Add Tags');
      setActiveExecStatusIndex(currentIdx >= 0 ? currentIdx : 0);
      setIsExecStatusOpen(true);
      return;
    }
    if (!isExecStatusOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveExecStatusIndex((prev) => Math.min(prev + 1, fullOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveExecStatusIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = fullOptions[activeExecStatusIndex];
      if (selected) handleExecStatusChange(selected === 'Add Tags' ? '' : selected);
      setIsExecStatusOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsExecStatusOpen(false);
    }
  };

  const handleMistakeTypeKeyDown = (e: React.KeyboardEvent) => {
    const fullOptions = ['Add Tags', ...MISTAKE_TYPE_OPTIONS];
    if (!isMistakeTypeOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const currentIdx = fullOptions.indexOf(trade?.mistake_type || 'Add Tags');
      setActiveMistakeTypeIndex(currentIdx >= 0 ? currentIdx : 0);
      setIsMistakeTypeOpen(true);
      return;
    }
    if (!isMistakeTypeOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveMistakeTypeIndex((prev) => Math.min(prev + 1, fullOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveMistakeTypeIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = fullOptions[activeMistakeTypeIndex];
      if (selected) handleMistakeTypeChange(selected === 'Add Tags' ? '' : selected);
      setIsMistakeTypeOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsMistakeTypeOpen(false);
    }
  };

  const handleMistakeTextKeyDown = (e: React.KeyboardEvent) => {
    const baseOptions = MISTAKE_TEXT_OPTIONS[trade?.mistake_type] || [];
    const fullOptions = ['Add Tags', ...baseOptions];
    if (!isMistakeTextOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const currentIdx = fullOptions.indexOf(trade?.mistake_text || 'Add Tags');
      setActiveMistakeTextIndex(currentIdx >= 0 ? currentIdx : 0);
      setIsMistakeTextOpen(true);
      return;
    }
    if (!isMistakeTextOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveMistakeTextIndex((prev) => Math.min(prev + 1, fullOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveMistakeTextIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = fullOptions[activeMistakeTextIndex];
      if (selected) handleMistakeTextChange(selected === 'Add Tags' ? '' : selected);
      setIsMistakeTextOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsMistakeTextOpen(false);
    }
  };

  // Playbooks rules handlers
  const handleToggleRule = async (ruleId: string, ruleType: 'entry' | 'exit', currentFollowed: boolean | null) => {
    const newFollowed = currentFollowed === true ? null : true;
    
    if (ruleType === 'entry') {
      setEntryRules(prev => prev.map(r => r.id === ruleId ? { ...r, followed: newFollowed } : r));
    } else {
      setExitRules(prev => prev.map(r => r.id === ruleId ? { ...r, followed: newFollowed } : r));
    }

    try {
      const { error } = await supabase
        .from('trade_rule_adherence')
        .update({ followed: newFollowed })
        .eq('id', ruleId)
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error updating rule adherence:', err);
      showError('Failed to update rule adherence.');
      // Rollback
      if (ruleType === 'entry') {
        setEntryRules(prev => prev.map(r => r.id === ruleId ? { ...r, followed: currentFollowed } : r));
      } else {
        setExitRules(prev => prev.map(r => r.id === ruleId ? { ...r, followed: currentFollowed } : r));
      }
    }
  };

  const handleUncheckAllRules = async (ruleType: 'entry' | 'exit') => {
    const targetRules = ruleType === 'entry' ? entryRules : exitRules;
    const ruleIds = targetRules.map(r => r.id);
    if (ruleIds.length === 0) return;

    const originalRules = [...targetRules];

    if (ruleType === 'entry') {
      setEntryRules(prev => prev.map(r => ({ ...r, followed: null })));
    } else {
      setExitRules(prev => prev.map(r => ({ ...r, followed: null })));
    }

    try {
      const { error } = await supabase
        .from('trade_rule_adherence')
        .update({ followed: null })
        .in('id', ruleIds)
        .eq('user_id', userId);
      
      if (error) throw error;
      showSuccess(`Unchecked all ${ruleType} rules.`);
    } catch (err) {
      console.error('Error unchecking all rules:', err);
      showError('Failed to uncheck rules.');
      if (ruleType === 'entry') {
        setEntryRules(originalRules);
      } else {
        setExitRules(originalRules);
      }
    }
  };

  // Running P&L TwelveData fetcher
  const symbolMap: Record<string, string> = {
    XAUUSD: "XAU/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD",
    BTCUSDT: "BTC/USDT", ETHUSDT: "ETH/USDT",
    NIFTY: "NIFTY", BANKNIFTY: "BANKNIFTY"
  };

  const getFullDatetimeString = (dateStr: string, timeStr: string | null | undefined) => {
    if (!timeStr) return dateStr;
    if (timeStr.includes('-') || timeStr.includes('T')) {
      return timeStr;
    }
    return `${dateStr} ${timeStr}`;
  };

  const getFallbackChartData = () => {
    if (!trade) return [];
    try {
      let entryDate = new Date(getFullDatetimeString(trade.date, trade.entry_time || trade.created_at));
      if (isNaN(entryDate.getTime())) {
        entryDate = new Date(trade.created_at || Date.now());
      }
      
      let exitDate = new Date(getFullDatetimeString(trade.date, trade.exit_time || trade.updated_at));
      if (isNaN(exitDate.getTime())) {
        exitDate = new Date(trade.updated_at || Date.now());
      }

      let entryMs = entryDate.getTime();
      let exitMs = exitDate.getTime();
      
      if (isNaN(entryMs)) entryMs = Date.now() - 3600000;
      if (isNaN(exitMs) || exitMs <= entryMs) exitMs = entryMs + 3600000;

      const duration = exitMs - entryMs;
      const finalPnl = trade.pnl || 0;

      const time1 = new Date(entryMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const time2 = new Date(entryMs + duration * 0.20).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const time3 = new Date(entryMs + duration * 0.50).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const time4 = new Date(entryMs + duration * 0.75).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const time5 = new Date(exitMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Point 2: initial adverse move against position
      let p2Pnl = finalPnl > 0 ? -(Math.abs(finalPnl) * 0.15) : -(Math.abs(finalPnl) * 0.30);
      if (trade.mae !== undefined && trade.mae !== null && trade.mae !== 0) {
        p2Pnl = -Math.abs(trade.mae);
      }

      // Point 3: trade moving toward result
      const p3Pnl = finalPnl > 0 ? finalPnl * 0.60 : finalPnl * 0.40;

      // Point 4: near peak/worst point
      let p4Pnl = finalPnl > 0 ? finalPnl * 1.10 : finalPnl * 0.80;
      if (trade.mfe !== undefined && trade.mfe !== null && trade.mfe !== 0) {
        p4Pnl = Math.abs(trade.mfe);
      }

      return [
        { name: time1, pnl: 0 },
        { name: time2, pnl: Math.round(p2Pnl) || 0 },
        { name: time3, pnl: Math.round(p3Pnl) || 0 },
        { name: time4, pnl: Math.round(p4Pnl) || 0 },
        { name: time5, pnl: Math.round(finalPnl) || 0 }
      ];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const fetchRunningPnlData = async () => {
      if (!trade) return;
      try {
        setChartLoading(true);
        setApiError(false);
        
        const mappedSymbol = symbolMap[trade.symbol] || trade.symbol;
        const startSec = getFullDatetimeString(trade.date, trade.entry_time);
        const endSec = getFullDatetimeString(trade.date, trade.exit_time || trade.entry_time);
        
        const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(mappedSymbol)}&interval=1min&start_date=${encodeURIComponent(startSec)}&end_date=${encodeURIComponent(endSec)}&apikey=demo`;
        
        const res = await fetch(url);
        const resJson = await res.json();
        
        if (resJson && Array.isArray(resJson.values) && resJson.values.length > 0) {
          const sortedValues = [...resJson.values].reverse();
          
          const isShort = trade.direction === 'SHORT' || trade.option_type === 'PUT';
          const qty = trade.quantity || 1;
          const baselinePrice = sortedValues.length > 0 ? parseFloat(sortedValues[0].close) : 0;
          
          const points = sortedValues.map((val: any) => {
            const closeVal = parseFloat(val.close);
            let runningPnl = 0;
            if (isShort) {
              runningPnl = (baselinePrice - closeVal) * qty;
            } else {
              runningPnl = (closeVal - baselinePrice) * qty;
            }
            const formattedTime = new Date(val.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return {
              time: formattedTime,
              pnl: runningPnl
            };
          });
          
          const entryLabel = new Date(startSec).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const exitLabel = new Date(endSec).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          const finalPoints = [
            { time: entryLabel, pnl: 0 },
            ...points,
            { time: exitLabel, pnl: trade.pnl || 0 }
          ];
          
          setChartData(finalPoints);
        } else {
          setApiError(true);
          setChartData(getFallbackChartData());
        }
      } catch (err) {
        console.warn('Error fetching TwelveData:', err);
        setApiError(true);
        setChartData(getFallbackChartData());
      } finally {
        setChartLoading(false);
      }
    };
    
    if (trade) {
      fetchRunningPnlData();
    }
  }, [trade?.symbol, trade?.entry_time, trade?.exit_time, trade?.quantity, trade?.pnl, trade?.mae, trade?.mfe, trade?.direction, trade?.option_type]);

  // Visual Embeddings States
  const [hasEmbedding, setHasEmbedding] = useState<boolean | null>(null);
  const [embedding, setEmbedding] = useState<any>(null);
  const [visualMatches, setVisualMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState<boolean>(false);
  const [generatingState, setGeneratingState] = useState<null | 'loading-model' | 'generating' | 'saving' | 'done' | 'error'>(null);
  const [generationProgress, setGenerationProgress] = useState<number>(0);

  const loadVisualMatches = async (embeddingVector: number[] | string) => {
    if (!userId || !tradeId) return;
    try {
      setMatchesLoading(true);
      let embeddingArray: number[];
      if (typeof embeddingVector === 'string') {
        const cleanStr = embeddingVector.replace(/[\[\]]/g, '');
        embeddingArray = cleanStr.split(',').map(Number);
      } else {
        embeddingArray = embeddingVector;
      }

      const { data: matches, error } = await supabase.rpc('match_trades', {
        query_embedding: embeddingArray,
        match_user_id: userId,
        match_strategy: null,
        similarity_threshold: 0.45,
        match_count: 5
      });

      if (error) throw error;

      if (matches) {
        const filteredMatches = matches.filter((m: any) => m.trade_id !== tradeId);
        setVisualMatches(filteredMatches);
      }
    } catch (err) {
      console.error('Error matching trades:', err);
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleGenerateEmbedding = async () => {
    if (!trade?.chart_image_url || !userId || !tradeId) return;

    try {
      setGeneratingState('loading-model');
      setGenerationProgress(0);

      const embedding = await generateEmbeddingFromUrl(trade.chart_image_url, (pct) => {
        setGenerationProgress(pct);
      });

      setGeneratingState('saving');

      const selectedStrategyName = trade.strategies?.name || null;

      const embeddingRecord = {
        trade_id: tradeId,
        user_id: userId,
        strategy_id: trade.strategy_id || null,
        image_url: trade.chart_image_url,
        embedding: embedding, // 512 numbers
        outcome: trade.status || null,
        execution_status: trade.execution_status || null,
        trade_rating: trade.trade_rating || null,
        technical_score: null,
        psychology_score: null,
        risk_score: null,
        setup_name: selectedStrategyName,
        ict_tags: []
      };

      const { data: insertedData, error } = await supabase
        .from('trade_visual_embeddings')
        .insert(embeddingRecord)
        .select()
        .single();

      if (error) throw error;

      setGeneratingState('done');
      setHasEmbedding(true);
      setEmbedding(insertedData);
      showSuccess('Chart patterns catalogued successfully!');

      await loadVisualMatches(insertedData?.embedding || embedding);
    } catch (err: any) {
      console.error('Error generating embedding:', err);
      showError(err.message || 'Failed to generate visual embedding.');
      setGeneratingState('error');
    }
  };

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

      const [tradeRes, psychRes, riskRes, rulesRes] = await Promise.all([
        supabase.from('trades').select('*, strategies(*)').eq('id', tradeId).single(),
        supabase.from('trade_psychology').select('*').eq('trade_id', tradeId).eq('user_id', userId),
        supabase.from('trade_risk_management').select('*').eq('trade_id', tradeId).eq('user_id', userId),
        supabase.from('trade_rule_adherence').select('*').eq('trade_id', tradeId).eq('user_id', userId)
      ]);

      if (tradeRes.error) {
        throw new Error(tradeRes.error.message || 'Trade records could not be fetched.');
      }

      setTrade(tradeRes.data);

      const rules = rulesRes.data || [];
      setEntryRules(rules.filter((r) => r.rule_type === 'entry'));
      setExitRules(rules.filter((r) => r.rule_type === 'exit'));

      const psych = psychRes.data?.[0] || null;
      const risk = riskRes.data?.[0] || null;

      setPsychology(psych);
      setRiskMgmt(risk);

      // On page load, query Supabase for existing embedding
      const { data: embedCheck } = await supabase
        .from('trade_visual_embeddings')
        .select('id, embedding')
        .eq('trade_id', tradeId)
        .eq('user_id', userId)
        .maybeSingle()

      if (embedCheck && embedCheck.id) {
        setHasEmbedding(true)
        setEmbedding(embedCheck)
        await loadVisualMatches(embedCheck.embedding);
      } else {
        setHasEmbedding(false)
      }

    } catch (err: any) {
      console.error('Error fetching trade tracking details:', err);
      showError(err.message || 'Failed to sync entire trade analytics context.');
      setFetchError(err);
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

  const zeroPercent = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return 100;
    const maxVal = Math.max(...chartData.map((d: any) => d.pnl), 0);
    const minVal = Math.min(...chartData.map((d: any) => d.pnl), 0);
    const totalRange = maxVal - minVal;
    return totalRange > 0 ? (maxVal / totalRange) * 100 : 100;
  }, [chartData]);

  // Score styling color code mapper
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
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

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-zinc-100" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="p-6 rounded-2xl max-w-md w-full text-center shadow-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500" style={{ backgroundColor: 'var(--row)', border: '1px solid var(--border)' }}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>Sync Failure</h2>
          <p className="text-xs mt-2 mb-6 leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            Could not fetch trade analytics context from the server.
          </p>
          <div className="rounded-xl p-3 text-left font-mono text-[10px] text-red-500 overflow-x-auto mb-6" style={{ backgroundColor: 'var(--bar)', border: '1px solid var(--border)' }}>
            <strong>Error:</strong> {fetchError.message || 'Unknown network or database issue.'}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setFetchError(null);
                fetchCompleteTradeContextData();
              }}
              className="font-semibold rounded-xl px-4 py-2.5 text-xs transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
            >
              Retry Sync
            </button>
            <Link
              to="/trading-logs"
              className="font-semibold rounded-xl px-4 py-2.5 text-xs transition-colors"
              style={{ backgroundColor: 'var(--bar)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              Back to Logs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-9 h-9 border-4 rounded-full animate-spin mb-3" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }} />
        <p className="text-xs font-mono tracking-widest uppercase animate-pulse" style={{ color: 'var(--text-sub)' }}>Fetching trade profile...</p>
      </div>
    );
  }

  if (!user || !trade) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <AlertTriangle className="w-12 h-12 text-red-500 mb-2" />
        <h2 className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>Trade Profile Missing</h2>
        <p className="text-sm mt-1 mb-6 text-center max-w-sm" style={{ color: 'var(--text-sub)' }}>
          We could not load this trade index. It may have been deleted or lives on another profile.
        </p>
        <Link
          to="/trading-logs"
          className="font-semibold rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2 transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Logs</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans selection:bg-indigo-500/30" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* MAIN CONTAINER */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
        {/* MOBILE HEADER BAR */}
        <header 
          className="flex items-center justify-between px-6 py-4 md:hidden sticky top-0 z-25"
          style={{ backgroundColor: 'var(--topbar)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="text-xl font-bold tracking-wider font-display" style={{ color: 'var(--accent)' }}>TRADELYZE</div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg cursor-pointer"
            style={{ color: 'var(--text-sub)' }}
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* PAGE BODY SCROLLER */}
        <main className="flex-1 overflow-y-auto px-0">
          <div className="max-w-7xl mx-auto">
            
            {/* BREADCRUMB ROW WITH TRADE NAVIGATION */}
            <div className="mb-1 flex items-center justify-between">
              <Link
                to="/trading-logs"
                style={{ color: 'var(--accent)' }}
                className="hover:opacity-90 text-sm inline-flex items-center gap-1 font-medium transition-all group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Trading Logs</span>
              </Link>
            </div>

            {/* HEADER STRIP */}
            <div style={{ backgroundColor: 'var(--card)', paddingTop: '4px', paddingBottom: '4px' }} className="-mx-6 px-6 mb-4 flex items-center justify-between border-b-0">
              <div>
                <h1 style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 700 }} className="text-xl md:text-2xl font-bold font-display">
                  Trade Tracking
                </h1>
              </div>
              <div className="flex items-center gap-2.5">
                {/* Ask AI - Placeholder */}
                <button
                  type="button"
                  onClick={() => navigate(`/ai-teacher?tradeId=${tradeId || (trade && trade.id)}`)}
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    height: '32px'
                  }}
                  className="hover:opacity-90 transition-all inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Ask AI ✨</span>
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => navigate(`/trade-entry/${trade.id}`)}
                  style={{
                    backgroundColor: 'var(--bar)',
                    border: '0.5px solid var(--border)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    height: '32px'
                  }}
                  className="hover:opacity-95 transition-all inline-flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Trade</span>
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '0.5px solid #ef4444',
                    color: '#ef4444',
                    borderRadius: '8px',
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    height: '32px'
                  }}
                  className="hover:bg-red-50 transition-all inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* NEEDS REVIEW WARNING BANNER */}
            {trade.needs_review && (
              <div 
                style={{ 
                  backgroundColor: 'rgba(249, 115, 22, 0.08)',
                  borderColor: 'rgba(249, 115, 22, 0.3)',
                  borderWidth: '1px',
                  borderRadius: '12px'
                }} 
                className="p-4.5 mb-6 flex items-start gap-3.5 text-sm"
              >
                <div style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }} className="p-2 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold tracking-tight text-white mb-1">
                    Unverified Synced Trade
                  </h4>
                  <p style={{ color: 'var(--text-sub)' }} className="text-xs leading-relaxed max-w-3xl">
                    This trade was synchronized automatically from your MetaTrader 5 terminal but has not been human-audited yet.
                    Please click <strong>Edit Trade</strong> to complete risk parameters, check rule adherence checklists, and rate psychological metrics to finalize your journaling database statistics.
                  </p>
                </div>
              </div>
            )}

            {/* Row 1: Symbol */}
            <div className="flex flex-wrap items-center gap-2.5" style={{ marginTop: '1px' }}>
              <h1 
                className="font-display" 
                style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}
              >
                {trade.symbol}
              </h1>
            </div>

            {/* Row 2: Date + Previous/Next Trade navigation, same horizontal line */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4" style={{ marginTop: '1px' }}>
              <div 
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
                style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-sub)' }}
              >
                <span className="font-mono">{formatFullDate(trade.date)}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevTrade}
                  disabled={!hasPrevious}
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '0.5px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-sub)',
                    fontSize: '12px',
                    padding: '6px 14px',
                    opacity: hasPrevious ? 1 : 0.4,
                    cursor: hasPrevious ? 'pointer' : 'not-allowed'
                  }}
                  className="hover:opacity-85 transition-all font-semibold"
                >
                  ← Previous Trade
                </button>
                <button
                  type="button"
                  onClick={handleNextTrade}
                  disabled={!hasNext}
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '0.5px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-sub)',
                    fontSize: '12px',
                    padding: '6px 14px',
                    opacity: hasNext ? 1 : 0.4,
                    cursor: hasNext ? 'pointer' : 'not-allowed'
                  }}
                  className="hover:opacity-85 transition-all font-semibold"
                >
                  Next Trade →
                </button>
              </div>
            </div>

            <div className="mb-5" />

            {/* SINGLE VERTICAL STACK */}
            <div className="flex flex-col gap-6">

                  <div className="space-y-6">
                    {/* SIDE-BY-SIDE STATS + CHART ROW */}
                    <div className="flex flex-col lg:flex-row gap-3 items-start">
                      {/* CARD A: TRADE DETAILS */}
                      <section 
                        style={{ 
                          backgroundColor: 'var(--card)', 
                          border: '1px solid rgba(0,0,0,0.06)', 
                          borderRadius: '12px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'
                        }} 
                        className="pt-4 pr-6 pb-6 pl-4 relative flex-1 min-w-0"
                      >
                        {/* THE NEW TAB BAR */}
                        <div 
                          style={{ border: '1px solid var(--accent)', backgroundColor: 'var(--card)' }} 
                          className="flex items-center rounded-lg p-1 w-fit mb-6 overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => setActiveTab('stats')}
                            style={{
                              backgroundColor: activeTab === 'stats' ? 'var(--accent-muted)' : 'transparent',
                              color: 'var(--text)',
                              fontWeight: activeTab === 'stats' ? 600 : 400,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            className="px-4 py-1 text-sm transition-all"
                          >
                            Stats
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('playbooks')}
                            style={{
                              backgroundColor: activeTab === 'playbooks' ? 'var(--accent-muted)' : 'transparent',
                              color: 'var(--text)',
                              fontWeight: activeTab === 'playbooks' ? 600 : 400,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            className="px-4 py-1 text-sm transition-all"
                          >
                            Playbooks
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('market')}
                            style={{
                              backgroundColor: activeTab === 'market' ? 'var(--accent-muted)' : 'transparent',
                              color: 'var(--text)',
                              fontWeight: activeTab === 'market' ? 600 : 400,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            className="px-4 py-1 text-sm transition-all"
                          >
                            Market
                          </button>
                        </div>

                        {activeTab === 'stats' && (
                          <>
                            {/* FINANCIAL GRID */}
                            <div>
                        <div className="flex flex-col">
                          {/* P&L */}
                          <div className="flex items-center justify-between py-1.5">
                            <span 
                              style={{ 
                                fontSize: '17px', 
                                fontWeight: 500, 
                                color: trade.pnl > 0 ? '#22c55e' : trade.pnl < 0 ? '#ef4444' : 'var(--text-sub)' 
                              }} 
                              className="font-mono"
                            >
                              NET P&L
                            </span>
                            <span
                              className="font-sans"
                              style={{ 
                                fontSize: '17px', 
                                fontWeight: 700, 
                                color: trade.pnl > 0 ? '#22c55e' : trade.pnl < 0 ? '#ef4444' : 'var(--text-sub)' 
                              }}
                            >
                              {formatINR(trade.pnl)}
                            </span>
                          </div>

                          {/* R-Multiple */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">R-Multiple Earned</span>
                            <span
                              className="font-sans"
                              style={{ 
                                fontSize: '14px', 
                                fontWeight: 700, 
                                color: trade.r_multiple > 0 ? '#22c55e' : '#ef4444' 
                              }}
                            >
                              {trade.r_multiple !== null ? `${trade.r_multiple > 0 ? '+' : ''}${trade.r_multiple.toFixed(2)}R` : '—'}
                            </span>
                          </div>

                          {/* ROI */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Return on Investment</span>
                            <span
                              className="font-sans"
                              style={{ 
                                fontSize: '14px', 
                                fontWeight: 700, 
                                color: trade.roi > 0 ? '#22c55e' : '#ef4444' 
                              }}
                            >
                              {trade.roi !== null ? `${trade.roi > 0 ? '+' : ''}${trade.roi.toFixed(1)}%` : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Decided Risk</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }} className="font-sans">
                              {riskMgmt ? formatINR(riskMgmt.decided_risk) : '—'}
                            </span>
                          </div>

                          {/* Risk */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Actual Risk Taken</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }} className="font-sans">
                              {formatINR(trade.risk)}
                            </span>
                          </div>

                          {/* Investment */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Total Allocation</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }} className="font-sans">
                              {formatINR(trade.investment)}
                            </span>
                          </div>

                          {/* Fees */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Brokerage Fees</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }} className="font-sans">
                              {formatINR(trade.fees)}
                            </span>
                          </div>

                          {/* Direction */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Direction</span>
                            {trade.direction ? (
                              <span
                                style={{
                                  backgroundColor: trade.direction === 'LONG' ? '#dcfce7' : '#fee2e2',
                                  color: trade.direction === 'LONG' ? '#16a34a' : '#dc2626',
                                  borderRadius: '6px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}
                                className="inline-block"
                              >
                                {trade.direction}
                              </span>
                            ) : (
                              <span className="font-mono" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>—</span>
                            )}
                          </div>

                          {/* Option Type */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Option Type</span>
                            {trade.option_type === 'CALL' || trade.option_type === 'PUT' ? (
                              <span
                                style={{
                                  backgroundColor: '#1e293b',
                                  color: '#ffffff',
                                  borderRadius: '6px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}
                                className="inline-block"
                              >
                                {trade.option_type}
                              </span>
                            ) : (
                              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-sub)' }} className="font-mono">NONE</span>
                            )}
                          </div>

                          {/* Quantity */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Quantity / Lots</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }} className="font-sans">
                              {trade.quantity !== null ? trade.quantity : '—'}
                            </span>
                          </div>

                          {/* Points */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Capture Points</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }} className="font-sans">
                              {trade.points !== null ? trade.points : '—'}
                            </span>
                          </div>

                          {/* Holding Time */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Holding Duration</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }} className="font-sans">
                              {trade.holding_time_mins !== null ? `${trade.holding_time_mins} mins` : '—'}
                            </span>
                          </div>

                          {/* Max Drawdown */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Max Drawdown (DD)</span>
                            <span className="font-sans" style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>
                              {formatINR(trade.max_drawdown)}
                            </span>
                          </div>

                          {/* MDD % */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Drawdown %</span>
                            <span className="font-sans" style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>
                              {trade.mdd_pct !== null ? `${trade.mdd_pct.toFixed(2)}%` : '—'}
                            </span>
                          </div>

                          {/* ROR */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Risk of Ruin (ROR)</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }} className="font-sans">
                              {trade.ror !== null ? `${trade.ror.toFixed(2)}%` : '—'}
                            </span>
                          </div>

                          {/* Profit Target */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">PROFIT TARGET</span>
                            <input
                              type="number"
                              step="any"
                              value={profitTarget}
                              onChange={e => setProfitTarget(e.target.value)}
                              onBlur={handleBlurProfitTarget}
                              placeholder="Target price"
                              style={{
                                backgroundColor: 'var(--bg)',
                                border: '0.5px solid var(--border)',
                                color: 'var(--text)',
                                outline: 'none',
                                fontSize: '13px',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                width: '120px',
                                textAlign: 'right'
                              }}
                              className="font-sans"
                            />
                          </div>

                          {/* Stop Loss Price */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">STOP LOSS PRICE</span>
                            <input
                              type="number"
                              step="any"
                              value={stopLossPrice}
                              onChange={e => setStopLossPrice(e.target.value)}
                              onBlur={handleBlurStopLossPrice}
                              placeholder="SL price"
                              style={{
                                backgroundColor: 'var(--bg)',
                                border: '0.5px solid var(--border)',
                                color: 'var(--text)',
                                outline: 'none',
                                fontSize: '13px',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                width: '120px',
                                textAlign: 'right'
                              }}
                              className="font-sans"
                            />
                          </div>

                          {/* Planned R-Multiple */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">PLANNED R-MULTIPLE</span>
                            <span
                              style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 700 }}
                              className="font-sans"
                            >
                              {calculatedPlannedR}
                            </span>
                          </div>

                          {/* MAE */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">MAE (Max Adverse Excursion)</span>
                            <input
                              type="number"
                              step="any"
                              value={maeValue}
                              onChange={e => setMaeValue(e.target.value)}
                              onBlur={handleBlurMae}
                              placeholder="Worst price against you"
                              style={{
                                backgroundColor: 'var(--bg)',
                                border: '0.5px solid var(--border)',
                                color: 'var(--text)',
                                outline: 'none',
                                fontSize: '13px',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                width: '120px',
                                textAlign: 'right'
                              }}
                              className="font-sans"
                            />
                          </div>

                          {/* MFE */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">MFE (Max Favorable Excursion)</span>
                            <input
                              type="number"
                              step="any"
                              value={mfeValue}
                              onChange={e => setMfeValue(e.target.value)}
                              onBlur={handleBlurMfe}
                              placeholder="Best price in your favor"
                              style={{
                                backgroundColor: 'var(--bg)',
                                border: '0.5px solid var(--border)',
                                color: 'var(--text)',
                                outline: 'none',
                                fontSize: '13px',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                width: '120px',
                                textAlign: 'right'
                              }}
                              className="font-sans"
                            />
                          </div>

                          {/* Gross P&L */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">GROSS P&L</span>
                            {(() => {
                              const grossVal = (trade.pnl || 0) + (trade.fees || 0);
                              return (
                                <span
                                  className="font-sans"
                                  style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 700, 
                                    color: grossVal > 0 ? '#22c55e' : grossVal < 0 ? '#ef4444' : 'var(--text-sub)' 
                                  }}
                                >
                                  {formatINR(grossVal)}
                                </span>
                              );
                            })()}
                          </div>

                          {/* Execution Match Class */}
                          <div className="flex items-center justify-between py-1.5 relative" ref={execStatusRef}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Execution Status</span>
                            
                            
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isExecStatusOpen) {
                                    const fullOptions = ['Add Tags', ...EXEC_STATUS_OPTIONS];
                                    const currentIdx = fullOptions.indexOf(trade.execution_status || 'Add Tags');
                                    setActiveExecStatusIndex(currentIdx >= 0 ? currentIdx : 0);
                                  }
                                  setIsExecStatusOpen(!isExecStatusOpen);
                                }}
                                onKeyDown={handleExecStatusKeyDown}
                                style={{
                                   border: '0.5px solid var(--border)',
                                   borderRadius: '6px',
                                   backgroundColor: 'var(--card)',
                                   color: 'var(--text)',
                                   padding: '4px 8px',
                                   width: '280px',
                                   fontSize: '13px',
                                   minHeight: '29px'
                                 }}
                                className="relative flex items-center justify-between gap-1.5 hover:border-[var(--accent)] transition-all cursor-pointer focus:outline-none focus:border-[var(--accent)] whitespace-nowrap overflow-hidden"
                              >
                                <div className="flex-1 min-w-0 text-left truncate flex items-center justify-start">
                                  {trade.execution_status ? (
                                    <span style={{ color: 'var(--text)', fontSize: '13px' }} className="font-mono font-medium truncate">
                                      {trade.execution_status}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }} className="font-mono font-medium truncate">Add Tags</span>
                                  )}
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                              </button>

                              {isExecStatusOpen && (
                                <div
                                  style={{
                                    borderColor: 'var(--border)',
                                    backgroundColor: 'var(--card)',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    minWidth: '160px'
                                  }}
                                  className="absolute right-0 z-50 mt-1 border rounded-lg overflow-hidden py-1 max-h-60 overflow-y-auto animate-fadeIn"
                                >
                                  {['Add Tags', ...EXEC_STATUS_OPTIONS].map((opt, index) => {
                                    const isSelected = opt === 'Add Tags' ? !trade.execution_status : opt === trade.execution_status;
                                    const isActive = index === activeExecStatusIndex;
                                    
                                    return (
                                      <div
                                        key={opt}
                                        onClick={() => {
                                          handleExecStatusChange(opt === 'Add Tags' ? '' : opt);
                                          setIsExecStatusOpen(false);
                                        }}
                                        onMouseEnter={() => setActiveExecStatusIndex(index)}
                                        style={{
                                          backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                                        }}
                                        className="px-3 py-1.5 text-xs cursor-pointer transition-colors flex items-center justify-between gap-4"
                                      >
                                        {opt === 'Add Tags' ? (
                                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }} className="font-mono font-medium">
                                            {opt}
                                          </span>
                                        ) : (
                                          <span style={{ color: 'var(--text)', fontSize: '13px' }} className="font-mono font-medium">
                                            {opt}
                                          </span>
                                        )}
                                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                          </div>

                          {/* Type of Mistake */}
                          <div className="flex items-center justify-between py-1.5 relative" ref={mistakeTypeRef}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Type of Mistake</span>
                            
                            
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isMistakeTypeOpen) {
                                    const fullOptions = ['Add Tags', ...MISTAKE_TYPE_OPTIONS];
                                    const currentIdx = fullOptions.indexOf(trade.mistake_type || 'Add Tags');
                                    setActiveMistakeTypeIndex(currentIdx >= 0 ? currentIdx : 0);
                                  }
                                  setIsMistakeTypeOpen(!isMistakeTypeOpen);
                                }}
                                onKeyDown={handleMistakeTypeKeyDown}
                                style={{
                                   border: '0.5px solid var(--border)',
                                   borderRadius: '6px',
                                   backgroundColor: 'var(--card)',
                                   color: 'var(--text)',
                                   padding: '4px 8px',
                                   width: '280px',
                                   fontSize: '13px',
                                   minHeight: '29px'
                                 }}
                                className="relative flex items-center justify-between gap-1.5 hover:border-[var(--accent)] transition-all cursor-pointer focus:outline-none focus:border-[var(--accent)] whitespace-nowrap overflow-hidden"
                              >
                                <div className="flex-1 min-w-0 text-left truncate flex items-center justify-start">
                                  {!trade.mistake_type ? (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }} className="font-mono font-medium truncate">Add Tags</span>
                                  ) : (
                                    <span style={{ color: 'var(--text)', fontSize: '13px' }} className="font-mono font-medium truncate">
                                      {trade.mistake_type}
                                    </span>
                                  )}
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                              </button>

                              {isMistakeTypeOpen && (
                                <div
                                  style={{
                                    borderColor: 'var(--border)',
                                    backgroundColor: 'var(--card)',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    minWidth: '160px'
                                  }}
                                  className="absolute right-0 z-50 mt-1 border rounded-lg overflow-hidden py-1 max-h-60 overflow-y-auto animate-fadeIn"
                                >
                                  {['Add Tags', ...MISTAKE_TYPE_OPTIONS].map((opt, index) => {
                                    const isSelected = opt === 'Add Tags' ? !trade.mistake_type : opt === (trade.mistake_type || 'No Mistake');
                                    const isActive = index === activeMistakeTypeIndex;
                                    
                                    return (
                                      <div
                                        key={opt}
                                        onClick={() => {
                                          handleMistakeTypeChange(opt === 'Add Tags' ? '' : opt);
                                          setIsMistakeTypeOpen(false);
                                        }}
                                        onMouseEnter={() => setActiveMistakeTypeIndex(index)}
                                        style={{
                                          backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                                        }}
                                        className="px-3 py-1.5 text-xs cursor-pointer transition-colors flex items-center justify-between gap-4"
                                      >
                                        {opt === 'Add Tags' ? (
                                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }} className="font-mono font-medium">
                                            {opt}
                                          </span>
                                        ) : (
                                          <span style={{ color: 'var(--text)', fontSize: '13px' }} className="font-mono font-medium">
                                            {opt}
                                          </span>
                                        )}
                                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                          </div>

                          {/* Actual Mistake */}
                          <div className="flex items-center justify-between py-1.5 relative" ref={mistakeTextRef}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Actual Mistake</span>
                            
                            {(!trade.mistake_type || trade.mistake_type === 'No Mistake') ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }} className="font-mono italic">
                                Clean trade execution
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isMistakeTextOpen) {
                                      const baseOptions = MISTAKE_TEXT_OPTIONS[trade.mistake_type] || [];
                                      const fullOptions = ['Add Tags', ...baseOptions];
                                      const currentIdx = fullOptions.indexOf(trade.mistake_text || 'Add Tags');
                                      setActiveMistakeTextIndex(currentIdx >= 0 ? currentIdx : 0);
                                    }
                                    setIsMistakeTextOpen(!isMistakeTextOpen);
                                  }}
                                  onKeyDown={handleMistakeTextKeyDown}
                                  style={{
                                    border: '0.5px solid var(--border)',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--card)',
                                    color: 'var(--text)',
                                    padding: '4px 8px',
                                    width: '280px',
                                    fontSize: '13px',
                                    minHeight: '29px'
                                  }}
                                  className="relative flex items-center justify-between gap-1.5 hover:border-[var(--accent)] transition-all cursor-pointer focus:outline-none focus:border-[var(--accent)] whitespace-nowrap overflow-hidden"
                                >
                                  <div className="flex-1 min-w-0 text-left truncate flex items-center justify-start">
                                    <span style={{ color: trade.mistake_text ? 'var(--text)' : 'var(--text-muted)', fontSize: '13px' }} className="font-mono font-medium truncate">
                                      {trade.mistake_text || 'Add Tags'}
                                    </span>
                                  </div>
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                                </button>

                                {isMistakeTextOpen && (
                                  <div
                                    style={{
                                      borderColor: 'var(--border)',
                                      backgroundColor: 'var(--card)',
                                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                      width: '280px'
                                    }}
                                    className="absolute right-0 z-50 mt-1 border rounded-lg overflow-hidden py-1 max-h-60 overflow-y-auto animate-fadeIn"
                                  >
                                    {['Add Tags', ...(MISTAKE_TEXT_OPTIONS[trade.mistake_type] || [])].map((opt, index) => {
                                      const isSelected = opt === 'Add Tags' ? !trade.mistake_text : opt === trade.mistake_text;
                                      const isActive = index === activeMistakeTextIndex;
                                      return (
                                        <div
                                          key={opt}
                                          onClick={() => {
                                            handleMistakeTextChange(opt === 'Add Tags' ? '' : opt);
                                            setIsMistakeTextOpen(false);
                                          }}
                                          onMouseEnter={() => setActiveMistakeTextIndex(index)}
                                          style={{
                                            backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                                            color: isSelected ? 'var(--accent)' : 'var(--text)',
                                            fontWeight: isSelected ? 600 : 400
                                          }}
                                          className="px-3 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between gap-2"
                                        >
                                          {opt === 'Add Tags' ? (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }} className="font-mono font-medium">
                                               {opt}
                                             </span>
                                          ) : (
                                            <span style={{ fontSize: '13px' }} className="text-left break-words max-w-[220px] font-medium">{opt}</span>
                                          )}
                                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Trade Rating clickable stars */}
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Trade Rating</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((starNum) => {
                                const isFilled = (trade.trade_rating || 0) >= starNum;
                                return (
                                  <button
                                    key={starNum}
                                    type="button"
                                    onClick={() => handleTradeRatingChange(trade.trade_rating === starNum ? 0 : starNum)}
                                    className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
                                  >
                                    <Star
                                      className={`w-5 h-5 transition-colors duration-150 ${
                                        isFilled
                                          ? 'fill-amber-400 text-amber-400 hover:text-amber-300 hover:fill-amber-300'
                                          : 'text-zinc-600 hover:text-amber-400'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }} className="font-mono ml-1.5">
                                {trade.trade_rating || 0}/5
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                        </>
                      )}

                      {activeTab === 'playbooks' && (
                        <div className="space-y-6 animate-fadeIn">
                          
                          {/* Setup Dropdown */}
                          <div className="relative" ref={setupDropdownRef}>
                            <span style={{ color: 'var(--text)', fontSize: '16px' }} className="block font-semibold tracking-wide font-sans mb-1.5">
                              Setup
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isSetupDropdownOpen) {
                                  const currentIdx = strategiesList.findIndex((s) => s.id === trade?.strategy_id);
                                  setActiveSetupIndex(currentIdx >= 0 ? currentIdx : 0);
                                }
                                setIsSetupDropdownOpen(!isSetupDropdownOpen);
                              }}
                              onKeyDown={handleSetupDropdownKeyDown}
                              style={{
                                borderColor: 'var(--border)',
                                color: 'var(--text)',
                                backgroundColor: 'var(--card)'
                              }}
                              className="w-full flex items-center justify-between border rounded-lg px-1 py-2 text-sm hover:border-[var(--accent)] transition-all cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                            >
                              <span>
                                {strategiesList.find((s) => s.id === trade?.strategy_id)?.name || 'Select a setup'}
                              </span>
                              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                            </button>

                            {isSetupDropdownOpen && (
                              <div
                                style={{
                                  borderColor: 'var(--border)',
                                  backgroundColor: 'var(--card)',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                }}
                                className="absolute left-0 right-0 z-50 mt-1 border rounded-lg overflow-hidden py-1 max-h-60 overflow-y-auto animate-fadeIn"
                              >
                                {strategiesList.length === 0 ? (
                                  <div style={{ color: 'var(--text-muted)' }} className="px-3 py-2 text-xs font-medium">
                                    No setups found
                                  </div>
                                ) : (
                                  strategiesList.map((s: any, index: number) => {
                                    const isSelected = s.id === trade?.strategy_id;
                                    const isActive = index === activeSetupIndex;
                                    return (
                                      <div
                                        key={s.id}
                                        onClick={() => {
                                          handleStrategyChange(s.id);
                                          setIsSetupDropdownOpen(false);
                                        }}
                                        onMouseEnter={() => setActiveSetupIndex(index)}
                                        style={{
                                          backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                                          color: isSelected ? 'var(--accent)' : 'var(--text)',
                                          fontWeight: isSelected ? 600 : 400
                                        }}
                                        className="px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between"
                                      >
                                        <span>{s.name}</span>
                                        {isSelected && <Check className="w-4 h-4 text-[var(--accent)]" />}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>

                          {/* ENTRY RULES SECTION */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <span style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, textTransform: 'none' }} className="font-display">
                                Entry Rules
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUncheckAllRules('entry')}
                                style={{ color: 'var(--text-muted)', fontSize: '11px' }}
                                className="hover:underline hover:opacity-85 transition-all cursor-pointer font-sans"
                              >
                                UNCHECK ALL
                              </button>
                            </div>

                            {/* Progress bar showing rules followed */}
                            {(() => {
                              const totalCount = entryRules.length;
                              const followedCount = entryRules.filter(r => r.followed === true).length;
                              const percentage = totalCount > 0 ? (followedCount / totalCount) * 100 : 0;
                              return (
                                <div className="mb-5">
                                  <div style={{ backgroundColor: 'var(--bar)' }} className="w-full h-1.5 rounded-[3px] overflow-hidden">
                                    <div 
                                      style={{ width: `${percentage}%`, backgroundColor: 'var(--accent)' }}
                                      className="h-full rounded-[3px] transition-all duration-300" 
                                    />
                                  </div>
                                  <span style={{ color: 'var(--text-sub)' }} className="text-xs mt-2 block font-medium">
                                    {followedCount} / {totalCount} rules followed
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Entry Rules list with Checkboxes */}
                            <div className="space-y-1 mt-4">
                              {entryRules.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)' }} className="text-xs italic py-2">
                                  No entry rules defined for this strategy.
                                </div>
                              ) : (
                                entryRules.map((rule) => {
                                  const isChecked = rule.followed === true;
                                  return (
                                    <div
                                      key={rule.id}
                                      onClick={() => handleToggleRule(rule.id, 'entry', rule.followed)}
                                      style={{ borderColor: 'var(--border)' }}
                                      className="flex items-center gap-3 py-1 hover:bg-[var(--accent-muted)]/10 px-1 rounded-lg transition-colors cursor-pointer group"
                                    >
                                      <div
                                        style={{
                                          borderColor: isChecked ? '#22c55e' : '#ef4444',
                                          backgroundColor: isChecked ? '#22c55e' : 'transparent',
                                          width: '18px',
                                          height: '18px',
                                          fontSize: '13px'
                                        }}
                                        className="rounded border flex items-center justify-center transition-colors shrink-0"
                                      >
                                        {isChecked && (
                                          <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                                        )}
                                      </div>
                                      <span style={{ fontSize: '13px', color: 'var(--text)' }} className="flex-1 leading-snug">
                                        {rule.rule_text}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* EXIT RULES SECTION */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <span style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, textTransform: 'none' }} className="font-display">
                                Exit Rules
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUncheckAllRules('exit')}
                                style={{ color: 'var(--text-muted)', fontSize: '11px' }}
                                className="hover:underline hover:opacity-85 transition-all cursor-pointer font-sans"
                              >
                                UNCHECK ALL
                              </button>
                            </div>

                            {/* Progress bar showing rules followed */}
                            {(() => {
                              const totalCount = exitRules.length;
                              const followedCount = exitRules.filter(r => r.followed === true).length;
                              const percentage = totalCount > 0 ? (followedCount / totalCount) * 100 : 0;
                              return (
                                <div className="mb-5">
                                  <div style={{ backgroundColor: 'var(--bar)' }} className="w-full h-1.5 rounded-[3px] overflow-hidden">
                                    <div 
                                      style={{ width: `${percentage}%`, backgroundColor: 'var(--accent)' }}
                                      className="h-full rounded-[3px] transition-all duration-300" 
                                    />
                                  </div>
                                  <span style={{ color: 'var(--text-sub)' }} className="text-xs mt-2 block font-medium">
                                    {followedCount} / {totalCount} rules followed
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Exit Rules list with Checkboxes */}
                            <div className="space-y-1 mt-4">
                              {exitRules.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)' }} className="text-xs italic py-2">
                                  No exit rules defined for this strategy.
                                </div>
                              ) : (
                                exitRules.map((rule) => {
                                  const isChecked = rule.followed === true;
                                  return (
                                    <div
                                      key={rule.id}
                                      onClick={() => handleToggleRule(rule.id, 'exit', rule.followed)}
                                      style={{ borderColor: 'var(--border)' }}
                                      className="flex items-center gap-3 py-1 hover:bg-[var(--accent-muted)]/10 px-1 rounded-lg transition-colors cursor-pointer group"
                                    >
                                      <div
                                        style={{
                                          borderColor: isChecked ? '#22c55e' : '#ef4444',
                                          backgroundColor: isChecked ? '#22c55e' : 'transparent',
                                          width: '18px',
                                          height: '18px',
                                          fontSize: '13px'
                                        }}
                                        className="rounded border flex items-center justify-center transition-colors shrink-0"
                                      >
                                        {isChecked && (
                                          <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                                        )}
                                      </div>
                                      <span style={{ fontSize: '13px', color: 'var(--text)' }} className="flex-1 leading-snug">
                                        {rule.rule_text}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                        </div>
                      )}

                      {activeTab === 'market' && (
                        <div className="space-y-6 animate-fadeIn">
                          <h3 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 700, textTransform: 'none' }} className="font-display tracking-wider mb-3 pb-1">
                            Market
                          </h3>
                          <div>
                            <div className="flex items-center justify-between py-1.5">
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Market Phase</span>
                              <div className="relative" ref={phaseRef}>
                                <button
                                  type="button"
                                  onClick={() => { if (!isPhaseOpen) { const fullOptions = ['Add Tags', ...PHASE_OPTIONS]; setActivePhaseIndex(fullOptions.indexOf(trade?.phase || 'Add Tags') >= 0 ? fullOptions.indexOf(trade?.phase || 'Add Tags') : 0); } setIsPhaseOpen(!isPhaseOpen); }}
                                  onKeyDown={handlePhaseKeyDown}
                                  style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)', outline: 'none', fontSize: '13px', borderRadius: '6px', padding: '4px 8px', width: '280px', minHeight: '29px' }}
                                  className="font-sans cursor-pointer flex items-center justify-between gap-1 hover:border-[var(--accent)] transition-all focus:outline-none focus:border-[var(--accent)]"
                                >
                                  <span className="flex-1 min-w-0 text-left truncate">
                                    {trade?.phase || <span style={{ color: 'var(--text-muted)' }}>Add Tags</span>}
                                  </span>
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                                </button>
                                {isPhaseOpen && (
                                  <div style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }} className="absolute right-0 z-50 mt-1 border rounded-lg overflow-hidden py-1 min-w-[140px] max-h-60 overflow-y-auto animate-fadeIn">
                                    {['Add Tags', ...PHASE_OPTIONS].map((opt, idx) => (
                                      <div key={opt} onClick={() => { handlePhaseChange(opt === 'Add Tags' ? '' : opt); setIsPhaseOpen(false); }} onMouseEnter={() => setActivePhaseIndex(idx)} style={{ backgroundColor: idx === activePhaseIndex ? 'var(--accent-muted)' : 'transparent', color: opt === 'Add Tags' ? 'var(--text-muted)' : 'var(--text)' }} className="px-3 py-1.5 text-xs cursor-pointer transition-colors">
                                        {opt}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-1.5">
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Trend Location</span>
                              <div className="relative" ref={trendRef}>
                                <button
                                  type="button"
                                  onClick={() => { if (!isTrendOpen) { const fullOptions = ['Add Tags', ...TREND_OPTIONS]; setActiveTrendIndex(fullOptions.indexOf(trade?.trend_position || 'Add Tags') >= 0 ? fullOptions.indexOf(trade?.trend_position || 'Add Tags') : 0); } setIsTrendOpen(!isTrendOpen); }}
                                  onKeyDown={handleTrendKeyDown}
                                  style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)', outline: 'none', fontSize: '13px', borderRadius: '6px', padding: '4px 8px', width: '280px', minHeight: '29px' }}
                                  className="font-sans cursor-pointer flex items-center justify-between gap-1 hover:border-[var(--accent)] transition-all focus:outline-none focus:border-[var(--accent)]"
                                >
                                  <span className="flex-1 min-w-0 text-left truncate">
                                    {trade?.trend_position || <span style={{ color: 'var(--text-muted)' }}>Add Tags</span>}
                                  </span>
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                                </button>
                                {isTrendOpen && (
                                  <div style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }} className="absolute right-0 z-50 mt-1 border rounded-lg overflow-hidden py-1 min-w-[140px] max-h-60 overflow-y-auto animate-fadeIn">
                                    {['Add Tags', ...TREND_OPTIONS].map((opt, idx) => (
                                      <div key={opt} onClick={() => { handleTrendChange(opt === 'Add Tags' ? '' : opt); setIsTrendOpen(false); }} onMouseEnter={() => setActiveTrendIndex(idx)} style={{ backgroundColor: idx === activeTrendIndex ? 'var(--accent-muted)' : 'transparent', color: opt === 'Add Tags' ? 'var(--text-muted)' : 'var(--text)' }} className="px-3 py-1.5 text-xs cursor-pointer transition-colors">
                                        {opt}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-1.5">
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Opening State</span>
                              <div className="relative" ref={openingRef}>
                                <button
                                  type="button"
                                  onClick={() => { if (!isOpeningOpen) { const fullOptions = ['Add Tags', ...OPENING_OPTIONS]; setActiveOpeningIndex(fullOptions.indexOf(trade?.opening_condition || 'Add Tags') >= 0 ? fullOptions.indexOf(trade?.opening_condition || 'Add Tags') : 0); } setIsOpeningOpen(!isOpeningOpen); }}
                                  onKeyDown={handleOpeningKeyDown}
                                  style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)', outline: 'none', fontSize: '13px', borderRadius: '6px', padding: '4px 8px', width: '280px', minHeight: '29px' }}
                                  className="font-sans cursor-pointer flex items-center justify-between gap-1 hover:border-[var(--accent)] transition-all focus:outline-none focus:border-[var(--accent)]"
                                >
                                  <span className="flex-1 min-w-0 text-left truncate">
                                    {trade?.opening_condition || <span style={{ color: 'var(--text-muted)' }}>Add Tags</span>}
                                  </span>
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                                </button>
                                {isOpeningOpen && (
                                  <div style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }} className="absolute right-0 z-50 mt-1 border rounded-lg overflow-hidden py-1 min-w-[140px] max-h-60 overflow-y-auto animate-fadeIn">
                                    {['Add Tags', ...OPENING_OPTIONS].map((opt, idx) => (
                                      <div key={opt} onClick={() => { handleOpeningChange(opt === 'Add Tags' ? '' : opt); setIsOpeningOpen(false); }} onMouseEnter={() => setActiveOpeningIndex(idx)} style={{ backgroundColor: idx === activeOpeningIndex ? 'var(--accent-muted)' : 'transparent', color: opt === 'Add Tags' ? 'var(--text-muted)' : 'var(--text)' }} className="px-3 py-1.5 text-xs cursor-pointer transition-colors">
                                        {opt}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-1.5">
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }} className="font-mono">Hourly Trend</span>
                              <div className="relative" ref={hourlyRef}>
                                <button
                                  type="button"
                                  onClick={() => { if (!isHourlyOpen) { const fullOptions = ['Add Tags', ...HOURLY_OPTIONS]; setActiveHourlyIndex(fullOptions.indexOf(trade?.hourly_trend || 'Add Tags') >= 0 ? fullOptions.indexOf(trade?.hourly_trend || 'Add Tags') : 0); } setIsHourlyOpen(!isHourlyOpen); }}
                                  onKeyDown={handleHourlyKeyDown}
                                  style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)', outline: 'none', fontSize: '13px', borderRadius: '6px', padding: '4px 8px', width: '280px', minHeight: '29px' }}
                                  className="font-sans cursor-pointer flex items-center justify-between gap-1 hover:border-[var(--accent)] transition-all focus:outline-none focus:border-[var(--accent)]"
                                >
                                  <span className="flex-1 min-w-0 text-left truncate">
                                    {trade?.hourly_trend ? (HOURLY_DISPLAY_LABELS[trade.hourly_trend] || trade.hourly_trend) : <span style={{ color: 'var(--text-muted)' }}>Add Tags</span>}
                                  </span>
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                                </button>
                                {isHourlyOpen && (
                                  <div style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }} className="absolute right-0 z-50 mt-1 border rounded-lg overflow-hidden py-1 min-w-[140px] max-h-60 overflow-y-auto animate-fadeIn">
                                    {['Add Tags', ...HOURLY_OPTIONS].map((opt, idx) => (
                                      <div key={opt} onClick={() => { handleHourlyChange(opt === 'Add Tags' ? '' : opt); setIsHourlyOpen(false); }} onMouseEnter={() => setActiveHourlyIndex(idx)} style={{ backgroundColor: idx === activeHourlyIndex ? 'var(--accent-muted)' : 'transparent', color: opt === 'Add Tags' ? 'var(--text-muted)' : 'var(--text)' }} className="px-3 py-1.5 text-xs cursor-pointer transition-colors">
                                        {opt === 'Add Tags' ? opt : (HOURLY_DISPLAY_LABELS[opt] || opt)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </section>

                    {/* TRADINGVIEW CHART CARD COLUMN */}
                    <div className="shrink-0 mt-6 lg:mt-0 flex flex-col gap-6" style={{ width: '778px' }}>
                      <div 
                        style={{ 
                          backgroundColor: 'var(--card)', 
                          border: '1px solid rgba(0,0,0,0.06)', 
                          borderRadius: '12px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                          padding: '16px 20px'
                        }}
                      >
                        <TradeChart trade={trade} userTheme={userTheme} />
                      </div>

                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 min-w-0">
                          {/* CARD H: MEDIA VIEWER ZONE */}
                          <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="rounded-xl p-6 shadow-sm">
                            <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, textTransform: 'none' }} className="font-display mb-3">
                              Trade Attachments
                            </h2>

                            <div className="space-y-4 text-xs">
                              {/* Chart Screenshot */}
                              <div>
                                <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] font-bold font-mono uppercase tracking-widest mb-1.5 font-sans">
                                  Chart Screenshot
                                </span>
                                {trade.chart_image_url ? (
                                  <div
                                    style={{ position: 'relative', cursor: 'pointer' }}
                                    onClick={() => setViewerOpen(true)}
                                    className="group rounded-xl overflow-hidden border border-[var(--border)] bg-zinc-950"
                                  >
                                    <img
                                      src={trade.chart_image_url}
                                      style={{ width: '100%', borderRadius: '8px', display: 'block', border: '0.5px solid var(--border)' }}
                                      alt="Chart execution screenshot"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div
                                      style={{ position: 'absolute', inset: 0, borderRadius: '8px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      className="opacity-70 group-hover:opacity-100 transition-opacity"
                                    >
                                      <span style={{ fontSize: '11px', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '20px' }}>
                                        🔍 Click to view & draw
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ backgroundColor: 'var(--bar)', border: '0.5px dashed var(--border)', color: 'var(--text-muted)' }} className="p-3 rounded-xl text-center italic">
                                    No chart image snapshot archived.
                                  </div>
                                )}
                              </div>

                              {/* Trade Video Recording */}
                              {trade.trade_video_url && (
                                <div style={{ borderColor: 'var(--border)' }} className="pt-2 border-t">
                                  <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] font-bold font-mono uppercase tracking-widest mb-2 font-sans">
                                    Trade Recording Video
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => window.open(trade.trade_video_url, '_blank')}
                                    style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', color: 'var(--text-sub)' }}
                                    className="w-full hover:opacity-90 font-semibold rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 cursor-pointer transition-all"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-cyan-500" />
                                    <span>Watch Playback Recording</span>
                                  </button>
                                </div>
                              )}

                              {/* Trade Plan PDF/image */}
                              {trade.trade_plan_url && (
                                <div style={{ borderColor: 'var(--border)' }} className="pt-2 border-t">
                                  <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] font-bold font-mono uppercase tracking-widest mb-2 font-sans">
                                    Associated Trade Plan
                                  </span>
                                  {trade.trade_plan_url.toLowerCase().endsWith('.pdf') ? (
                                    <button
                                      type="button"
                                      onClick={() => window.open(trade.trade_plan_url, '_blank')}
                                      style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', color: 'var(--text-sub)' }}
                                      className="w-full hover:opacity-90 font-semibold rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 cursor-pointer transition-all"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-cyan-500" />
                                      <span>Read Trade Plan (PDF)</span>
                                    </button>
                                  ) : (
                                    <div style={{ borderColor: 'var(--border)' }} className="relative group rounded-xl overflow-hidden border bg-zinc-950">
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
                        <div className="flex-1 min-w-0">
                          {/* SPECIAL CARD: VISUAL PATTERN MATCH */}
                          <section 
                            style={{ 
                              backgroundColor: 'var(--card)', 
                              border: '1px solid rgba(0,0,0,0.06)', 
                              borderRadius: '12px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'
                            }} 
                            className="p-6 h-full"
                          >
                            <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }} className="font-display">Visual Pattern Match</h2>
                            <p style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono uppercase tracking-wider mb-2">Machine vision resemblance</p>

                            {matchesLoading ? (
                              <div className="flex flex-col items-center py-6 gap-2">
                                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                                <span style={{ color: 'var(--text-muted)' }} className="text-xs font-mono">Running structural comparisons...</span>
                              </div>
                            ) : !trade.chart_image_url ? (
                              <div style={{ backgroundColor: 'var(--bar)', border: '0.5px dashed var(--border)', color: 'var(--text-muted)' }} className="text-xs italic py-4 text-center rounded-xl px-4">
                                Upload a chart screenshot to activate automated pattern-matching intelligence!
                              </div>
                            ) : visualMatches.length === 0 ? (
                              <div style={{ backgroundColor: 'var(--bar)', border: '0.5px dashed var(--border)', color: 'var(--text-muted)' }} className="text-xs italic py-4 text-center rounded-xl px-4">
                                No visually similar patterns found in your library yet. Keep logging trades with chart screenshots!
                              </div>
                            ) : (
                              <div className="space-y-3 font-sans">
                                <p style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono uppercase tracking-wider">
                                  Matches (Threshold &gt; 45%)
                                </p>
                                <div style={{ borderColor: 'var(--border)' }} className="divide-y">
                                  {visualMatches.map((match) => {
                                    const matchPercent = (match.similarity * 100).toFixed(1);
                                    
                                    let outcomeBadge = null;
                                    if (match.outcome === 'Win') {
                                      outcomeBadge = <span style={{ backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', fontSize: '10px', fontWeight: 700, padding: '1px 5px', display: 'inline-block' }} className="uppercase font-mono">WIN</span>;
                                    } else if (match.outcome === 'Loss') {
                                      outcomeBadge = <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '10px', fontWeight: 700, padding: '1px 5px', display: 'inline-block' }} className="uppercase font-mono">LOSS</span>;
                                    } else if (match.outcome === 'Breakeven') {
                                      outcomeBadge = <span style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', color: 'var(--text-sub)', borderRadius: '6px', fontSize: '10px', fontWeight: 700, padding: '1px 5px', display: 'inline-block' }} className="uppercase font-mono">BE</span>;
                                    }

                                    return (
                                      <div key={match.trade_id} style={{ borderColor: 'var(--border)' }} className="py-3 first:pt-0 last:pb-0 flex gap-3 group">
                                        {/* Thumbnail */}
                                        <div style={{ borderColor: 'var(--border)' }} className="w-16 h-12 rounded-lg overflow-hidden bg-zinc-950 border flex-shrink-0 relative">
                                          <img
                                            src={match.image_url}
                                            alt="Matching pattern representation"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>
                                        
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-1.5">
                                            <Link
                                              to={`/trading-logs/${match.trade_id}`}
                                              style={{ color: 'var(--text)' }}
                                              className="text-xs font-semibold hover:text-[var(--accent)] truncate tracking-wide"
                                            >
                                              Setup: {match.setup_name || 'Unnamed Setup'}
                                            </Link>
                                            <span style={{ color: 'var(--text-sub)' }} className="text-[10px] font-bold font-mono shrink-0">
                                              {matchPercent}%
                                            </span>
                                          </div>
                                          
                                          <div className="flex items-center gap-2 mt-1.5">
                                            {outcomeBadge}
                                            {match.trade_rating && (
                                              <div className="flex items-center gap-0.5 text-amber-500">
                                                {Array.from({ length: Math.min(5, match.trade_rating) }).map((_, i) => (
                                                  <Star key={i} className="w-2.5 h-2.5 fill-current" />
                                                ))}
                                              </div>
                                            )}
                                            <span style={{ color: 'var(--text-muted)' }} className="text-[9px] font-mono">
                                              Rating: {match.trade_rating || '—'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </section>
                        </div>
                      </div>
                    </div>
                  </div>



                    {/* CARD E: KEY PERFORMANCE SCOREBOARD + SPIDER RADAR */}
                    <div className="flex gap-6 items-start">
                      <div className="rounded-xl px-5 pb-5 pt-2.5" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', height: '300px', width: '416px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '8px', left: '16px', zIndex: 1, margin: 0, textAlign: 'left', width: 'calc(100% - 32px)', paddingTop: '0px', borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: '4px', marginBottom: '8px' }}>
                          <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px' }}>
                            Performance Score
                          </h2>
                        </div>

                        <div style={{ position: 'absolute', top: '58%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                          <RadarScoreChart
                            technicalScore={technicalScore}
                            psychScore={psychScore}
                            riskScore={riskScore}
                          />

                          {/* OVERALL SUMMARY CENTER */}
                          <div style={{ flexShrink: 0, padding: '4px 0', textAlign: 'center', marginTop: '-22px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>Your Score: </span>
                            <span className="animate-pulse" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
                              {overallScore.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CHANGE 4 — Running P&L Chart Card */}
                      <section 
                        style={{ 
                          backgroundColor: 'var(--card)', 
                          border: '1px solid rgba(0,0,0,0.06)', 
                          borderRadius: '12px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                          height: '300px'
                        }} 
                        className="px-5 pb-5 pt-2.5 overflow-hidden flex-1 min-w-0"
                      >
                      <div className="flex items-center justify-between mb-1" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: '4px', marginBottom: '8px' }}>
                        <h2 style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }} className="font-display">
                          Running P&L Chart
                        </h2>
                        {chartLoading ? (
                          <span style={{ color: 'var(--accent)' }} className="text-xs font-mono animate-pulse">Syncing TwelveData...</span>
                        ) : apiError ? (
                          null
                        ) : (
                          <span style={{ color: '#008F67' }} className="text-xs font-mono">Live Session Data</span>
                        )}
                      </div>

                      <div className="h-[230px] min-h-[230px] w-full flex items-center justify-center font-sans mt-2">
                        {chartLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                            <span style={{ color: 'var(--text-muted)' }} className="text-xs font-mono">Loading market bars...</span>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={chartData}
                              margin={{ top: 6, right: 6, bottom: 0, left: 4 }}
                            >
                              <defs>
                                <linearGradient id="pnlAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#008F67" stopOpacity={0.55} />
                                  <stop offset={`${zeroPercent}%`} stopColor="#008F67" stopOpacity={0.02} />
                                  <stop offset={`${zeroPercent}%`} stopColor="#DF1C30" stopOpacity={0.02} />
                                  <stop offset="100%" stopColor="#DF1C30" stopOpacity={0.55} />
                                </linearGradient>
                                <linearGradient id="pnlLineGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset={`${zeroPercent}%`} stopColor="#008F67" stopOpacity={1} />
                                  <stop offset={`${zeroPercent}%`} stopColor="#DF1C30" stopOpacity={1} />
                                </linearGradient>
                              </defs>

                              <CartesianGrid horizontal={true} vertical={false} stroke="var(--border)" strokeDasharray="3 4" />

                              <YAxis
                                tick={{ fontSize: 10, fill: 'var(--text-sub)' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => {
                                  if (v === 0) return '₹0';
                                  if (Math.abs(v) >= 1000) return `₹${(v/1000).toFixed(1)}K`;
                                  return `₹${v}`;
                                }}
                                tickCount={8}
                                domain={['auto', 'auto']}
                                width={52}
                                tickMargin={6}
                              />

                              <ReferenceLine
                                y={0}
                                stroke="var(--border)"
                                strokeDasharray="3 3"
                              />

                              <Area
                                type="monotone"
                                dataKey="pnl"
                                stroke="none"
                                fill="url(#pnlAreaGrad)"
                                baseLine={0}
                              />

                              <Line
                                type="monotone"
                                dataKey="pnl"
                                stroke="url(#pnlLineGrad)"
                                strokeWidth={1.5}
                                dot={(props: any) => {
                                  const { cx, cy, index } = props;
                                  if (index === 0) {
                                    return (
                                      <circle
                                        cx={cx}
                                        cy={cy}
                                        r={5}
                                        fill="white"
                                        stroke="#008F67"
                                        strokeWidth={2}
                                        key="dot-entry"
                                      />
                                    );
                                  }
                                  return <g key={`dot-empty-${index}`} />;
                                }}
                                activeDot={(props: any) => {
                                  const { cx, cy, payload } = props;
                                  if (cx === undefined || cy === undefined) return null;
                                  const isPos = (payload?.pnl ?? 0) >= 0;
                                  const dotColor = isPos ? '#008F67' : '#DF1C30';
                                  return (
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={3}
                                      fill={dotColor}
                                      stroke="white"
                                      strokeWidth={1.5}
                                    />
                                  );
                                }}
                              />

                              <Tooltip
                                cursor={false}
                                content={(props: any) => {
                                  const { active, payload } = props;
                                  if (!active || !payload?.length) return null;
                                  const val = payload[0]?.value as number;
                                  return (
                                    <div style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontFamily: 'monospace' }}>
                                      <span style={{ color: 'var(--text)' }}>Net P&L : </span>
                                      <span style={{ color: val >= 0 ? '#008F67' : '#DF1C30', fontWeight: 600 }}>{val >= 0 ? '+' : '-'}₹{Math.abs(val).toLocaleString('en-IN')}</span>
                                    </div>
                                  );
                                }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </section>
                  </div>

                    {/* CARD D: GENERAL EXECUTION QUALITY & TRADER NOTES */}
                    <section 
                      style={{ 
                        backgroundColor: 'var(--card)', 
                        border: '1px solid rgba(0,0,0,0.06)', 
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'
                      }} 
                      className="p-6 relative"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="w-5 h-5 text-amber-500" />
                        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }} className="font-display">Execution & Notes</h2>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <div className="flex flex-col">
                          <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }} className="block font-mono mb-2">
                            Post-Trade Reflections
                          </span>
                          <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            onBlur={handleBlurNotes}
                            placeholder="What happened on this trade? What did you observe? What would you do differently? Key lesson..."
                            style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', borderRadius: '12px', fontSize: '13px', color: 'var(--text)', padding: '16px' }}
                            className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)] resize-y"
                          />
                        </div>
                      </div>
                    </section>

                    {/* ASK AI BUTTON AT BOTTOM OF RIGHT COLUMN */}
                    <button
                      type="button"
                      onClick={() => navigate(`/ai-teacher?tradeId=${tradeId || (trade && trade.id)}`)}
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      className="hover:opacity-90 transition-all shadow-sm"
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>Ask AI Assistant</span>
                    </button>
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

      {viewerOpen && trade?.chart_image_url && (
        <ChartImageViewer
          imageUrl={trade.chart_image_url}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
};

export const TradeTrackingPage: React.FC = () => {
  return (
    <ErrorBoundary>
      <TradeTrackingPageContent />
    </ErrorBoundary>
  );
};
