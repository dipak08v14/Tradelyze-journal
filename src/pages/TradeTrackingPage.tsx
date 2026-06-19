import React, { useState, useEffect, Component } from 'react';
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
  Check
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
  const [activeTab, setActiveTab] = useState<'stats' | 'playbooks'>('stats');

  // CHANGE 3 — Form states
  const [profitTarget, setProfitTarget] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [maeValue, setMaeValue] = useState<string>('');
  const [mfeValue, setMfeValue] = useState<string>('');

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

  // Planned R-Multiple auto-calculated read-only formula
  const calculatedPlannedR = React.useMemo(() => {
    return '—';
  }, []);

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
        console.error('Error fetching TwelveData:', err);
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
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            
            {/* BREADCRUMB ROW WITH TRADE NAVIGATION */}
            <div className="mb-3 flex items-center justify-between">
              <Link
                to="/trading-logs"
                style={{ color: 'var(--accent)' }}
                className="hover:opacity-90 text-sm inline-flex items-center gap-1 font-medium transition-all group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Trading Logs</span>
              </Link>

              {/* CHANGE 1 — Previous Trade / Next Trade navigation */}
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

            {/* ACTIONABLE ROW */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-100 font-display">
                    {trade.symbol} — Trade Profile
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

                {/* DIRECTION & OPTION TYPE Row */}
                <div className="flex items-center gap-8 mt-4 border border-[var(--border)] bg-[var(--bar)] p-3 rounded-xl max-w-xs">
                  <div>
                    <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] font-bold uppercase tracking-wider font-mono">DIRECTION</span>
                    <div className="mt-1">
                      {trade.direction ? (
                        <span
                          style={{
                            backgroundColor: trade.direction === 'LONG' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                            color: trade.direction === 'LONG' ? '#22c55e' : '#ef4444',
                            borderRadius: '999px',
                            padding: '2px 10px',
                            fontSize: '10px',
                            fontWeight: 700,
                            border: 'none'
                          }}
                          className="inline-block"
                        >
                          {trade.direction}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-zinc-500">—</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] font-bold uppercase tracking-wider font-mono">OPTION TYPE</span>
                    <div className="mt-1">
                      {trade.option_type === 'CALL' || trade.option_type === 'PUT' ? (
                        <span
                          style={{
                            backgroundColor: 'var(--accent-muted)',
                            color: 'var(--accent)',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontWeight: 700
                          }}
                          className="inline-block"
                        >
                          {trade.option_type}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }} className="text-xs font-mono font-medium">NONE</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTROLS */}
              <div className="flex flex-wrap items-center gap-2.5 mt-2 md:mt-0 font-sans">
                {/* Ask AI - Placeholder */}
                <button
                  type="button"
                  onClick={() => navigate(`/ai-teacher?tradeId=${tradeId || (trade && trade.id)}`)}
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
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
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
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
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  className="hover:bg-red-50 transition-all inline-flex items-center gap-1.5"
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
                
                {/* TABS SELECTOR ROW */}
                <div style={{ borderColor: 'var(--border)' }} className="flex border-b w-full gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('stats')}
                    style={{
                      backgroundColor: activeTab === 'stats' ? 'var(--accent-muted)' : 'transparent',
                      color: activeTab === 'stats' ? 'var(--accent)' : 'var(--text-sub)',
                      borderBottom: activeTab === 'stats' ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                    className="px-5 py-3 text-sm font-bold transition-all cursor-pointer focus:outline-none"
                  >
                    Stats
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('playbooks')}
                    style={{
                      backgroundColor: activeTab === 'playbooks' ? 'var(--accent-muted)' : 'transparent',
                      color: activeTab === 'playbooks' ? 'var(--accent)' : 'var(--text-sub)',
                      borderBottom: activeTab === 'playbooks' ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                    className="px-5 py-3 text-sm font-bold transition-all cursor-pointer focus:outline-none"
                  >
                    Playbooks
                  </button>
                </div>

                {/* STATS TAB CONTENT */}
                {activeTab === 'stats' && (
                  <div className="space-y-6">
                    {/* CARD A: TRADE DETAILS */}
                    <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="rounded-xl p-6 shadow-sm relative">
                      <div className="flex items-center gap-2 mb-4">
                        <Briefcase className="w-5 h-5 text-[#06b6d4]" />
                        <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold font-display">Trade Accountancies</h2>
                      </div>

                      {/* FINANCIAL GRID */}
                      <div>
                        <h3 style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }} className="text-[10px] font-bold font-mono uppercase tracking-wider mb-3 border-b pb-1">
                          Financial Calculations
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {/* P&L */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">P&L Gain/Loss</span>
                            <span
                              className={`text-lg font-black font-mono block mt-1 ${
                                trade.pnl > 0 ? 'text-[#22c55e]' : trade.pnl < 0 ? 'text-[#ef4444]' : 'var(--text-sub)'
                              }`}
                            >
                              {formatINR(trade.pnl)}
                            </span>
                          </div>

                          {/* R-Multiple */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">R-Multiple Earned</span>
                            <span
                              className={`text-lg font-black font-mono block mt-1 ${
                                trade.r_multiple > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                              }`}
                            >
                              {trade.r_multiple !== null ? `${trade.r_multiple > 0 ? '+' : ''}${trade.r_multiple.toFixed(2)}R` : '—'}
                            </span>
                          </div>

                          {/* ROI */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">Return on Investment</span>
                            <span
                              className={`text-lg font-black font-mono block mt-1 ${
                                trade.roi > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                              }`}
                            >
                              {trade.roi !== null ? `${trade.roi > 0 ? '+' : ''}${trade.roi.toFixed(1)}%` : '—'}
                            </span>
                          </div>

                          {/* Risk */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">Actual Risk Taken</span>
                            <span style={{ color: 'var(--text)' }} className="text-sm font-bold block mt-1 font-mono">
                              {formatINR(trade.risk)}
                            </span>
                          </div>

                          {/* Investment */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">Total Allocation</span>
                            <span style={{ color: 'var(--text)' }} className="text-sm font-bold block mt-1 font-mono">
                              {formatINR(trade.investment)}
                            </span>
                          </div>

                          {/* Fees */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">Brokerage Fees</span>
                            <span style={{ color: 'var(--text)' }} className="text-sm font-bold block mt-1 font-mono">
                              {formatINR(trade.fees)}
                            </span>
                          </div>

                          {/* Quantity */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">Quantity / Lots</span>
                            <span style={{ color: 'var(--text)' }} className="text-sm font-bold block mt-1 font-mono">
                              {trade.quantity !== null ? trade.quantity : '—'}
                            </span>
                          </div>

                          {/* Points */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">Capture Points</span>
                            <span style={{ color: 'var(--text)' }} className="text-sm font-bold block mt-1 font-mono">
                              {trade.points !== null ? trade.points : '—'}
                            </span>
                          </div>

                          {/* Holding Time */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">Holding Duration</span>
                            <span style={{ color: 'var(--text)' }} className="text-sm font-bold block mt-1 font-mono">
                              {trade.holding_time_mins !== null ? `${trade.holding_time_mins} mins` : '—'}
                            </span>
                          </div>

                          {/* Max Drawdown */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">Max Drawdown (DD)</span>
                            <span className="text-red-500 text-sm font-bold block mt-1 font-mono font-bold">
                              {formatINR(trade.max_drawdown)}
                            </span>
                          </div>

                          {/* MDD % */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">Drawdown %</span>
                            <span className="text-red-500 text-sm font-bold block mt-1 font-mono font-bold">
                              {trade.mdd_pct !== null ? `${trade.mdd_pct.toFixed(2)}%` : '—'}
                            </span>
                          </div>

                          {/* ROR */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-bold uppercase tracking-wide font-mono">Risk of Ruin (ROR)</span>
                            <span style={{ color: 'var(--text)' }} className="text-sm font-bold block mt-1 font-mono font-bold">
                              {trade.ror !== null ? `${trade.ror.toFixed(2)}%` : '—'}
                            </span>
                          </div>

                          {/* Profit Target */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }} className="block font-bold uppercase tracking-wide font-mono">PROFIT TARGET</span>
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
                                width: '100%',
                                marginTop: '4px'
                              }}
                              className="font-mono"
                            />
                          </div>

                          {/* Stop Loss Price */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }} className="block font-bold uppercase tracking-wide font-mono">STOP LOSS PRICE</span>
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
                                width: '100%',
                                marginTop: '4px'
                              }}
                              className="font-mono"
                            />
                          </div>

                          {/* Planned R-Multiple */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }} className="block font-bold uppercase tracking-wide font-mono">PLANNED R-MULTIPLE</span>
                            <span
                              style={{ color: 'var(--accent)' }}
                              className="text-lg font-black font-mono block mt-1"
                            >
                              {calculatedPlannedR}
                            </span>
                          </div>

                          {/* MAE */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }} className="block font-bold uppercase tracking-wide font-mono">MAE (Max Adverse Excursion)</span>
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
                                width: '100%',
                                marginTop: '4px'
                              }}
                              className="font-mono"
                            />
                          </div>

                          {/* MFE */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }} className="block font-bold uppercase tracking-wide font-mono">MFE (Max Favorable Excursion)</span>
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
                                width: '100%',
                                marginTop: '4px'
                              }}
                              className="font-mono"
                            />
                          </div>

                          {/* Gross P&L */}
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3.5 rounded-xl">
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }} className="block font-bold uppercase tracking-wide font-mono">GROSS P&L</span>
                            {(() => {
                              const grossVal = (trade.pnl || 0) + (trade.fees || 0);
                              return (
                                <span
                                  className="text-lg font-black font-mono block mt-1"
                                  style={{ color: grossVal > 0 ? '#22c55e' : grossVal < 0 ? '#ef4444' : 'var(--text-sub)' }}
                                >
                                  {formatINR(grossVal)}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* CONTEXT GRID */}
                      <div style={{ borderColor: 'var(--border)' }} className="mt-6 pt-5 border-t">
                        <h3 style={{ color: 'var(--text-muted)' }} className="text-xs font-bold font-mono uppercase tracking-wider mb-3 pb-1">
                          Trading Context Variables
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div>
                            <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] uppercase font-mono">Entry Time</span>
                            <span style={{ color: 'var(--text)' }} className="text-xs font-bold block mt-0.5">{trade.entry_time || '—'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] uppercase font-mono">Market Phase</span>
                            <span style={{ color: 'var(--text)' }} className="text-xs font-bold block mt-0.5">{trade.phase || '—'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] uppercase font-mono">Trend Location</span>
                            <span style={{ color: 'var(--text)' }} className="text-xs font-bold block mt-0.5">{trade.trend_position || '—'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] uppercase font-mono">Opening State</span>
                            <span style={{ color: 'var(--text)' }} className="text-xs font-bold block mt-0.5">{trade.opening_condition || '—'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] uppercase font-mono">Hourly Trend</span>
                            <span style={{ color: 'var(--text)' }} className="text-xs font-bold block mt-0.5">{trade.hourly_trend || '—'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] uppercase font-mono">Vantage Month / Yr</span>
                            <span style={{ color: 'var(--text)' }} className="text-xs font-bold block mt-0.5 font-mono">
                              {trade.month} {trade.year}
                            </span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* TRADINGVIEW CHART CARD */}
                    <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
                      <TradeChart trade={trade} userTheme={userTheme} />
                    </div>

                    {/* CARD D: GENERAL EXECUTION QUALITY & TRADER NOTES */}
                    <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="rounded-xl p-6 shadow-sm relative">
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="w-5 h-5 text-amber-500" />
                        <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold font-display">Execution & Notes</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Execution left side parameters */}
                        <div className="space-y-4">
                          <div>
                            <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] font-bold font-mono uppercase tracking-widest mb-1.5 font-sans">
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
                              <span style={{ color: 'var(--text-muted)' }} className="italic text-xs">Uncategorized execution</span>
                            )}
                          </div>

                          <div>
                            <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] font-bold font-mono uppercase tracking-widest mb-1 font-sans">
                              Mistake Categorization
                            </span>
                            <div className="text-sm font-semibold text-zinc-200 mt-1 flex items-center gap-1.5">
                              {trade.mistake_type === 'No Mistake' || !trade.mistake_type ? (
                                <span className="text-green-500 font-bold bg-green-50 border border-green-200 px-2.5 py-0.5 rounded text-xs inline-block">
                                  No Mistake
                                </span>
                              ) : (
                                <span className="text-red-500 font-bold bg-red-50 border border-red-200 px-2.5 py-0.5 rounded text-xs inline-block">
                                  {trade.mistake_type}
                                </span>
                              )}
                            </div>
                            {trade.mistake_text && (
                              <p style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', color: 'var(--text)' }} className="text-xs mt-2 italic p-2.5 rounded-lg">
                                {trade.mistake_text}
                              </p>
                            )}
                          </div>

                          <div>
                            <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] font-bold font-mono uppercase tracking-widest mb-1.5 font-sans">
                              Synthesized Star Rating
                            </span>
                            {renderStars(trade.trade_rating)}
                            <span style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono mt-1 block">
                              {trade.trade_rating || 0} out of 5 stars
                            </span>
                          </div>
                        </div>

                        {/* Notes Box view */}
                        <div className="flex flex-col">
                          <span style={{ color: 'var(--text-sub)' }} className="block text-[10px] font-bold font-mono uppercase tracking-widest mb-2 font-sans">
                            Post-Trade Reflections
                          </span>
                          <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="rounded-xl p-4 flex-1 min-h-[140px]">
                            {trade.notes ? (
                              <p style={{ color: 'var(--text)' }} className="text-xs leading-relaxed whitespace-pre-wrap">
                                {trade.notes}
                              </p>
                            ) : (
                              <p style={{ color: 'var(--text-muted)' }} className="text-xs italic">
                                No diary notes transcribed for this trade.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* PLAYBOOKS TAB CONTENT */}
                {activeTab === 'playbooks' && (
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* Large P&L and Setup Name */}
                    <div style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="p-6 shadow-sm">
                      <div className="flex flex-col gap-1.5">
                        <span 
                          className="text-4xl font-extrabold tracking-tight font-mono"
                          style={{ color: trade.pnl > 0 ? '#22c55e' : trade.pnl < 0 ? '#ef4444' : 'var(--text-sub)' }}
                        >
                          {formatINR(trade.pnl)}
                        </span>
                        <span style={{ color: 'var(--text-sub)' }} className="text-sm font-semibold tracking-wide uppercase font-sans mt-0.5">
                          Setup: {trade.strategies?.name || 'Unnamed Setup'}
                        </span>
                      </div>
                    </div>

                    {/* ENTRY RULES SECTION */}
                    <div style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }} className="font-bold font-mono uppercase tracking-wider">
                          ENTRY RULES
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
                                className="flex items-center gap-3 py-3 border-b border-zinc-800/40 last:border-0 hover:bg-[var(--accent-muted)]/10 px-1 rounded-lg transition-colors cursor-pointer group"
                              >
                                <div
                                  style={{
                                    borderColor: isChecked ? 'var(--accent)' : 'var(--border)',
                                    backgroundColor: isChecked ? 'var(--accent)' : 'transparent',
                                  }}
                                  className="w-[18px] h-[18px] rounded border flex items-center justify-center transition-colors shrink-0"
                                >
                                  {isChecked && (
                                    <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                                  )}
                                </div>
                                <span style={{ color: 'var(--text)', fontSize: '13px' }} className="flex-1 leading-snug">
                                  {rule.rule_text}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* EXIT RULES SECTION */}
                    <div style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }} className="font-bold font-mono uppercase tracking-wider">
                          EXIT RULES
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
                                className="flex items-center gap-3 py-3 border-b border-zinc-800/40 last:border-0 hover:bg-[var(--accent-muted)]/10 px-1 rounded-lg transition-colors cursor-pointer group"
                              >
                                <div
                                  style={{
                                    borderColor: isChecked ? 'var(--accent)' : 'var(--border)',
                                    backgroundColor: isChecked ? 'var(--accent)' : 'transparent',
                                  }}
                                  className="w-[18px] h-[18px] rounded border flex items-center justify-center transition-colors shrink-0"
                                >
                                  {isChecked && (
                                    <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                                  )}
                                </div>
                                <span style={{ color: 'var(--text)', fontSize: '13px' }} className="flex-1 leading-snug">
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
              </div>

              {/* RIGHT SPANNING ONE COLUMN BENTO RAILS */}
              <div className="space-y-6">
                
                {/* CARD E: KEY PERFORMANCE SCOREBOARD + SPIDER RADAR */}
                <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="rounded-xl p-6 shadow-sm">
                  <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold font-display mb-1">
                    Performance Score
                  </h2>
                  <p style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono uppercase tracking-wider">Multidimensional analysis</p>

                  <div className="flex flex-col items-center justify-center mt-4">
                    {/* Big Score tag */}
                    <div className={`text-4xl font-black font-display tracking-tight ${getScoreColor(overallScore)}`}>
                      {overallScore.toFixed(0)}%
                    </div>
                    <div style={{ color: 'var(--text-sub)' }} className="text-[10px] font-bold font-mono uppercase tracking-wider mt-1">
                      Integrity Index
                    </div>
                  </div>

                  {/* Horizontal progress bars with reuse logic */}
                  <div style={{ borderColor: 'var(--border)' }} className="mt-5 space-y-4 pt-4 border-t">
                    {/* Technical bar */}
                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
                        <span style={{ color: 'var(--text-sub)' }}>Technical Rules (checklists)</span>
                        <span className={getScoreColor(technicalScore)}>{technicalScore.toFixed(0)}%</span>
                      </div>
                      <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="h-2 rounded-full overflow-hidden w-full">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${technicalScore}%`, backgroundColor: 'var(--accent)' }}
                        />
                      </div>
                    </div>

                    {/* Psychology bar */}
                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
                        <span style={{ color: 'var(--text-sub)' }}>Psychology (mindfulness)</span>
                        <span className={getScoreColor(psychScore)}>{psychScore.toFixed(0)}%</span>
                      </div>
                      <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="h-2 rounded-full overflow-hidden w-full">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${psychScore}%`, backgroundColor: 'var(--accent)' }}
                        />
                      </div>
                    </div>

                    {/* Risk bar */}
                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
                        <span style={{ color: 'var(--text-sub)' }}>Risk Management (guidelines)</span>
                        <span className={getScoreColor(riskScore)}>{riskScore.toFixed(0)}%</span>
                      </div>
                      <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="h-2 rounded-full overflow-hidden w-full">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${riskScore}%`, backgroundColor: 'var(--accent)' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* RADAR SCORE CHART IF INTEGRATED */}
                  <div style={{ borderColor: 'var(--border)' }} className="mt-6 pt-3 border-t">
                    <RadarScoreChart
                      technicalScore={technicalScore}
                      psychScore={psychScore}
                      riskScore={riskScore}
                    />
                  </div>

                  {activeTab === 'stats' && (
                    <div style={{ borderColor: 'var(--border)' }} className="mt-6 pt-4 border-t space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 style={{ color: 'var(--text)' }} className="text-xs font-bold font-mono uppercase tracking-wider">
                          Psychology Breakdown
                        </h3>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase">Subjective States</span>
                      </div>
                      {!psychology ? (
                        <div style={{ color: 'var(--text-muted)' }} className="text-xs italic py-2">
                          No psychology data for this trade
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {/* External Stress */}
                          <div>
                            <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                              <span style={{ color: 'var(--text-sub)' }}>External Factors / Stress</span>
                              <span style={{ color: 'var(--text)' }} className="font-bold font-mono">{psychology.external_stress_pct ?? 0}%</span>
                            </div>
                            <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${psychology.external_stress_pct ?? 0}%`, backgroundColor: 'var(--accent)' }} />
                            </div>
                          </div>

                          {/* Price Action */}
                          <div>
                            <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                              <span style={{ color: 'var(--text-sub)' }}>Price Action Reading</span>
                              <span style={{ color: 'var(--text)' }} className="font-bold font-mono">{psychology.price_action_reading_pct ?? 0}%</span>
                            </div>
                            <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${psychology.price_action_reading_pct ?? 0}%`, backgroundColor: 'var(--accent)' }} />
                            </div>
                          </div>

                          {/* Confidence */}
                          <div>
                            <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                              <span style={{ color: 'var(--text-sub)' }}>Self Confidence</span>
                              <span style={{ color: 'var(--text)' }} className="font-bold font-mono">{psychology.confidence_pct ?? 0}%</span>
                            </div>
                            <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${psychology.confidence_pct ?? 0}%`, backgroundColor: 'var(--accent)' }} />
                            </div>
                          </div>

                          {/* Entry Levels */}
                          <div>
                            <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                              <span style={{ color: 'var(--text-sub)' }}>Entry Levels Confidence</span>
                              <span style={{ color: 'var(--text)' }} className="font-bold font-mono">{psychology.entry_levels_pct ?? 0}%</span>
                            </div>
                            <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${psychology.entry_levels_pct ?? 0}%`, backgroundColor: 'var(--accent)' }} />
                            </div>
                          </div>

                          {/* Anxiety */}
                          <div>
                            <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                              <div className="flex items-center gap-1">
                                <span style={{ color: 'var(--text-sub)' }}>Anxiety</span>
                                <span className="text-[10px] text-amber-500 font-mono font-bold">(lower is better)</span>
                              </div>
                              <span className="text-amber-500 font-bold font-mono">{psychology.anxiety_pct ?? 0}%</span>
                            </div>
                            <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${psychology.anxiety_pct ?? 0}%`, backgroundColor: '#f59e0b' }} />
                            </div>
                          </div>

                          {/* Fear */}
                          <div>
                            <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                              <div className="flex items-center gap-1">
                                <span style={{ color: 'var(--text-sub)' }}>Fear</span>
                                <span className="text-[10px] text-red-500 font-mono font-bold">(lower is better)</span>
                              </div>
                              <span className="text-red-500 font-bold font-mono">{psychology.fear_pct ?? 0}%</span>
                            </div>
                            <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${psychology.fear_pct ?? 0}%`, backgroundColor: '#ef4444' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* CHANGE 4 — Running P&L Chart Card */}
                <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="rounded-xl p-6 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold font-display">
                      Running P&L Chart
                    </h2>
                    {chartLoading ? (
                      <span style={{ color: 'var(--accent)' }} className="text-xs font-mono animate-pulse">Syncing TwelveData...</span>
                    ) : apiError ? (
                      null
                    ) : (
                      <span className="text-xs text-green-500 font-mono">Live Session Data</span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono uppercase tracking-wider mb-4">
                    Intraday P&L trajectory analysis
                  </p>

                  <div className="h-[200px] min-h-[200px] w-full flex items-center justify-center font-sans">
                    {chartLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                        <span style={{ color: 'var(--text-muted)' }} className="text-xs font-mono">Loading market bars...</span>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 12, right: 12, bottom: 0, left: -10 }}
                        >
                          <defs>
                            {/* Gradient for fill area */}
                            <linearGradient id="pnlAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              {/* Green above zero: top (0%) has opacity 0.25, zero line has opacity 0.02 */}
                              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                              <stop offset={`${zeroPercent}%`} stopColor="#22c55e" stopOpacity={0.02} />
                              
                              {/* Red below zero: zero line has opacity 0.02, bottom (100%) has opacity 0.25 */}
                              <stop offset={`${zeroPercent}%`} stopColor="#ef4444" stopOpacity={0.02} />
                              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.25} />
                            </linearGradient>

                            {/* Gradient for LINE color */}
                            <linearGradient id="pnlLineGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset={`${zeroPercent}%`} stopColor="#22c55e" stopOpacity={1} />
                              <stop offset={`${zeroPercent}%`} stopColor="#ef4444" stopOpacity={1} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />

                          <YAxis
                            stroke="var(--text-muted)"
                            tickFormatter={(v) => v >= 0 ? `₹${v}` : `-₹${Math.abs(v)}`}
                            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                            axisLine={false}
                            tickLine={false}
                            width={55}
                          />

                          <ReferenceLine
                            y={0}
                            stroke="rgba(0,0,0,0.15)"
                            strokeDasharray="4 4"
                            strokeWidth={1}
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
                            strokeWidth={3}
                            dot={(props: any) => {
                              const { cx, cy, index } = props;
                              if (index === 0) {
                                return (
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={5}
                                    fill="white"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    key="dot-entry"
                                  />
                                );
                              }
                              if (index === chartData.length - 1) {
                                const isWin = props.payload?.pnl >= 0;
                                return (
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={7}
                                    fill={isWin ? '#22c55e' : '#ef4444'}
                                    stroke="white"
                                    strokeWidth={2.5}
                                    key="dot-exit"
                                  />
                                );
                              }
                              return <g key={`dot-empty-${index}`} />;
                            }}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: 'white' }}
                          />

                          <Tooltip
                            content={(props: any) => {
                              const { active, payload } = props;
                              if (!active || !payload?.length) return null;
                              const val = payload[0]?.value;
                              const isPos = val >= 0;
                              return (
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)' }} className="font-sans">
                                  <span style={{ color: isPos ? '#22c55e' : '#ef4444' }} className="text-xs font-bold font-mono">
                                    {isPos ? `+₹${val}` : `-₹${Math.abs(val)}`}
                                  </span>
                                </div>
                              );
                            }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>

                {/* CARD F: PSYCHOLOGY SUB-METRICS ANALYSIS */}
                <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="rounded-xl p-6 shadow-sm">
                  <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold font-display">
                    Psychology Spectrum
                  </h2>
                  <p style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono uppercase tracking-wider mb-2">Subjective states</p>

                  {!psychology ? (
                    <div style={{ color: 'var(--text-muted)' }} className="text-xs italic py-4">No psychology data for this trade</div>
                  ) : (
                    <div className="space-y-4 mt-3">
                      
                      {/* External Stress */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                          <span style={{ color: 'var(--text-sub)' }}>External Factors / Stress</span>
                          <span style={{ color: 'var(--text)' }} className="font-bold font-mono">{psychology.external_stress_pct}%</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bar)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full" style={{ width: `${psychology.external_stress_pct}%`, backgroundColor: 'var(--accent)' }} />
                        </div>
                      </div>

                      {/* Price Action */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                          <span style={{ color: 'var(--text-sub)' }}>Price Action Reading</span>
                          <span style={{ color: 'var(--text)' }} className="font-bold font-mono">{psychology.price_action_reading_pct}%</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bar)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full" style={{ width: `${psychology.price_action_reading_pct}%`, backgroundColor: 'var(--accent)' }} />
                        </div>
                      </div>

                      {/* Confidence */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                          <span style={{ color: 'var(--text-sub)' }}>Self Confidence</span>
                          <span style={{ color: 'var(--text)' }} className="font-bold font-mono">{psychology.confidence_pct}%</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bar)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full" style={{ width: `${psychology.confidence_pct}%`, backgroundColor: 'var(--accent)' }} />
                        </div>
                      </div>

                      {/* Entry Level Confidence */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                          <span style={{ color: 'var(--text-sub)' }}>Entry Levels Confidence</span>
                          <span style={{ color: 'var(--text)' }} className="font-bold font-mono">{psychology.entry_levels_pct}%</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bar)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full" style={{ width: `${psychology.entry_levels_pct}%`, backgroundColor: 'var(--accent)' }} />
                        </div>
                      </div>

                      {/* Anxiety */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                          <div className="flex items-center gap-1">
                            <span style={{ color: 'var(--text-sub)' }}>Anxiety</span>
                            <span className="text-[10px] text-amber-500 font-mono font-bold">(lower is better)</span>
                          </div>
                          <span className="text-amber-500 font-bold font-mono">{psychology.anxiety_pct}%</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bar)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full" style={{ width: `${psychology.anxiety_pct}%`, backgroundColor: '#f59e0b' }} />
                        </div>
                      </div>

                      {/* Fear */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1 font-sans">
                          <div className="flex items-center gap-1">
                            <span style={{ color: 'var(--text-sub)' }}>Fear</span>
                            <span className="text-[10px] text-red-500 font-mono font-bold">(lower is better)</span>
                          </div>
                          <span className="text-red-500 font-bold font-mono">{psychology.fear_pct}%</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bar)' }} className="h-1.5 rounded-full overflow-hidden w-full">
                          <div className="h-full rounded-full" style={{ width: `${psychology.fear_pct}%`, backgroundColor: '#ef4444' }} />
                        </div>
                      </div>

                      {/* Summary psychological score condition */}
                      <div style={{ borderColor: 'var(--border)' }} className="mt-4 pt-3 border-t flex items-center justify-between">
                        <span style={{ color: 'var(--text-sub)' }} className="text-[10px] font-bold uppercase tracking-widest font-mono">
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
                <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="rounded-xl p-6 shadow-sm">
                  <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold font-display">Risk Management</h2>
                  <p style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono uppercase tracking-wider mb-2">Exposure analysis</p>

                  {!riskMgmt ? (
                    <div style={{ color: 'var(--text-muted)' }} className="text-xs italic py-4">No risk data for this trade</div>
                  ) : (
                    <div className="space-y-4 mt-3">
                      <div style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--border)' }} className="p-3 rounded-xl border font-sans">
                        <span style={{ color: 'var(--text-sub)' }} className="block text-[9px] font-bold uppercase tracking-brand font-mono">Decided Risk</span>
                        <span style={{ color: 'var(--text)' }} className="text-sm font-semibold block mt-0.5 font-mono">
                          {formatINR(riskMgmt.decided_risk)}
                        </span>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold font-mono mb-1.5 font-sans">
                          <span style={{ color: 'var(--text-sub)' }}>Followed Risk Rules</span>
                          <span className={getScoreColor(riskScore)}>{riskScore.toFixed(0)}%</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="h-2 rounded-full overflow-hidden w-full">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${riskScore}%`, backgroundColor: 'var(--accent)' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                   {/* CARD H: MEDIA VIEWER ZONE */}
                <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="rounded-xl p-6 shadow-sm">
                  <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold font-display mb-3">
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

                {/* SPECIAL CARD: VISUAL PATTERN MATCH */}
                <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 font-sans">
                    <Sparkles className="w-5 h-5 text-cyan-500" />
                    <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold font-display">
                      Visual Pattern Match
                    </h2>
                  </div>

                  {!trade.chart_image_url ? (
                    <div style={{ backgroundColor: 'var(--bar)', border: '0.5px dashed var(--border)', color: 'var(--text-muted)' }} className="text-xs italic py-4 text-center rounded-xl px-4">
                      No chart screenshot uploaded for this trade.
                    </div>
                  ) : hasEmbedding === null ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-3">
                      <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                  ) : hasEmbedding === false ? (
                    <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="rounded-xl p-4 text-left">
                      {generatingState ? (
                        <div className="space-y-3 font-sans">
                          <div className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                            <span style={{ color: 'var(--text)' }} className="text-xs font-medium">
                              {generatingState === 'loading-model' && `Loading Vision Model... ${generationProgress > 0 ? generationProgress + '%' : ''}`}
                              {generatingState === 'generating' && 'Identifying edge structures...'}
                              {generatingState === 'saving' && 'Cataloging chart vectors...'}
                              {generatingState === 'error' && 'Failed to convert chart'}
                            </span>
                          </div>
                          {generatingState === 'loading-model' && generationProgress > 0 && (
                            <div style={{ backgroundColor: 'var(--border)' }} className="rounded-full h-1 w-full overflow-hidden">
                              <div className="bg-cyan-500 h-1 transition-all" style={{ width: `${generationProgress}%` }} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGenerateEmbedding}
                          style={{ backgroundColor: 'var(--accent)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                          className="w-full hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Embedding</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {matchesLoading ? (
                        <div className="flex flex-col items-center justify-center py-6 gap-3">
                          <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                          <span style={{ color: 'var(--text-muted)' }} className="text-xs font-mono">Comparing visual parameters...</span>
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
                                outcomeBadge = <span className="bg-green-950/85 border border-green-800 text-green-400 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">WIN</span>;
                              } else if (match.outcome === 'Loss') {
                                outcomeBadge = <span className="bg-red-950/85 border border-red-800 text-red-400 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">LOSS</span>;
                              } else if (match.outcome === 'Breakeven') {
                                outcomeBadge = <span className="bg-zinc-850 border border-zinc-800 text-zinc-400 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase font-mono">BE</span>;
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
                    </div>
                  )}
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
