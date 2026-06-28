import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import { ScoreBar } from '../components/ScoreBar';
import { StarRating } from '../components/StarRating';
import { RuleChecklist } from '../components/RuleChecklist';
import { PsychSlider } from '../components/PsychSlider';
import { ExecutionPicker, ExecutionStatus } from '../components/ExecutionPicker';
import { Menu, Save, ImagePlus, Target, X, CheckSquare, CheckCircle2 } from 'lucide-react';
import { Strategy, StagedRuleState } from '../types';
import { generateEmbeddingFromUrl } from '../lib/clipEmbedder';

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

export const TradeEntryPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Navigation & Page State
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const [loading, setLoading] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  // Edit Mode Stored Assets
  const [existingChartImageUrl, setExistingChartImageUrl] = useState<string | null>(null);
  const [existingPlanUrl, setExistingPlanUrl] = useState<string | null>(null);
  const [chartRemoved, setChartRemoved] = useState<boolean>(false);
  const [planRemoved, setPlanRemoved] = useState<boolean>(false);

  // Card 1: Trade Details
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [entryTime, setEntryTime] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('');
  const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false);
  const symbolContainerRef = useRef<HTMLDivElement>(null);

  const symbolSuggestions = useMemo(() => {
    if (!symbol.trim()) return [];
    return PREDEFINED_SYMBOLS.filter((s) =>
      s.toLowerCase().includes(symbol.toLowerCase())
    ).slice(0, 6);
  }, [symbol]);

  const isSymbolNonStandard = useMemo(() => {
    const trimmedVal = symbol.toUpperCase().trim();
    if (!trimmedVal) return false;
    return !PREDEFINED_SYMBOLS.includes(trimmedVal);
  }, [symbol]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (symbolContainerRef.current && !symbolContainerRef.current.contains(event.target as Node)) {
        setShowSymbolSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} style={{ color: 'var(--accent)' }} className="font-bold">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };
  const [direction, setDirection] = useState<'LONG' | 'SHORT' | null>(null);
  const [optionType, setOptionType] = useState<'CALL' | 'PUT' | null>(null);
  const [strategyId, setStrategyId] = useState<string>('');
  const [openingCondition, setOpeningCondition] = useState<string>('');
  const [hourlyTrend, setHourlyTrend] = useState<'UP' | 'DOWN' | 'CONSOLIDATION' | null>(null);
  const [phase, setPhase] = useState<string>('');
  const [trendPosition, setTrendPosition] = useState<string>('');
  const [holdingTimeMins, setHoldingTimeMins] = useState<string>('');

  // Card 2: Financial Data
  const [investment, setInvestment] = useState<string>('');
  const [risk, setRisk] = useState<string>('');
  const [pnl, setPnl] = useState<string>('');
  const [maxDrawdown, setMaxDrawdown] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [points, setPoints] = useState<string>('');
  const [fees, setFees] = useState<string>('0');

  // Card 4 & 5: Rule adherence checklists
  const [entryRules, setEntryRules] = useState<StagedRuleState[]>([]);
  const [exitRules, setExitRules] = useState<StagedRuleState[]>([]);

  // Card 6: Execution Quality
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null);
  const [mistakeType, setMistakeType] = useState<string>('');
  const [mistakeText, setMistakeText] = useState<string>('');
  const [tradeRating, setTradeRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Target values, SL prices and excursions
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [profitTarget, setProfitTarget] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [mae, setMae] = useState<string>('');
  const [mfe, setMfe] = useState<string>('');

  // Card 8: Psychology Sliders
  const [externalStress, setExternalStress] = useState<number>(0);
  const [priceActionReading, setPriceActionReading] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [entryLevels, setEntryLevels] = useState<number>(0);
  const [anxiety, setAnxiety] = useState<number>(0);
  const [fear, setFear] = useState<number>(0);

  // Card 9: Risk Management
  const [decidedRisk, setDecidedRisk] = useState<string>('');
  const [followedRiskRulesPct, setFollowedRiskRulesPct] = useState<number>(100);

  // Card 10: Trade Media Files
  const [chartImageFile, setChartImageFile] = useState<File | null>(null);
  const [chartImagePreview, setChartImagePreview] = useState<string | null>(null);
  const [tradeVideoUrl, setTradeVideoUrl] = useState<string>('');
  const [tradePlanFile, setTradePlanFile] = useState<File | null>(null);
  const [tradePlanPreview, setTradePlanPreview] = useState<string | null>(null);

  const [embeddingStatus, setEmbeddingStatus] = useState<null | 'loading-model' | 'generating' | 'saving' | 'done' | 'error'>(null);
  const [embeddingProgress, setEmbeddingProgress] = useState<number>(0);

  // Drag and Drop State
  const [dragActiveChart, setDragActiveChart] = useState(false);
  const [dragActivePlan, setDragActivePlan] = useState(false);

  // File Inputs references
  const chartInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle Auth redirection
  useEffect(() => {
    if (!authLoading && !userId) {
      navigate('/login');
    }
  }, [userId, authLoading, navigate]);

  // Load active user strategies for dropdown selection on page mount
  useEffect(() => {
    if (!userId) return;
    const fetchActiveStrategies = async () => {
      try {
        const { data, error } = await supabase
          .from('strategies')
          .select('id, name, sr_no, type_of_strategy')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('sr_no', { ascending: true });

        if (error) throw error;
        if (data) {
          setStrategies(data as Strategy[]);
        }
      } catch (err: any) {
        console.error('Error fetching active strategies:', err);
        showError('Could not load setups list');
      }
    };
    fetchActiveStrategies();
  }, [userId]);

  // Load existing trade configuration when in edit mode
  useEffect(() => {
    if (!userId || !id) return;

    const fetchTradeForEdit = async () => {
      setLoading(true);
      try {
        let tradeData: any = null;
        try {
          const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
          if (error) {
            console.warn('Silent error trade fetch:', error);
          } else {
            tradeData = data;
          }
        } catch (e) {
          console.warn('Silent exception trade fetch:', e);
        }

        let allRules: any[] = [];
        try {
          const { data, error } = await supabase
            .from('trade_rule_adherence')
            .select('*')
            .eq('trade_id', id)
            .eq('user_id', userId)
            .order('rule_type')
            .order('rule_order', { ascending: true });
          if (!error && data) {
            allRules = data;
          }
        } catch (e) {
          console.warn('Silent exception rule adherence fetch:', e);
        }

        let psychData: any = null;
        try {
          const { data, error } = await supabase
            .from('trade_psychology')
            .select('*')
            .eq('trade_id', id)
            .eq('user_id', userId)
            .maybeSingle();
          if (!error && data) {
            psychData = data;
          }
        } catch (e) {
          console.warn('Silent exception psychology fetch:', e);
        }

        let riskData: any = null;
        try {
          const { data, error } = await supabase
            .from('trade_risk_management')
            .select('*')
            .eq('trade_id', id)
            .eq('user_id', userId)
            .maybeSingle();
          if (!error && data) {
            riskData = data;
          }
        } catch (e) {
          console.warn('Silent exception risk fetch:', e);
        }

        if (tradeData) {
          setDate(tradeData.date || '');
          setEntryTime(tradeData.entry_time || '');
          setSymbol(tradeData.symbol || '');
          setDirection(tradeData.direction || null);
          setOptionType(tradeData.option_type || null);
          setStrategyId(tradeData.strategy_id || '');
          setOpeningCondition(tradeData.opening_condition || '');
          setHourlyTrend(tradeData.hourly_trend || null);
          setPhase(tradeData.phase || '');
          setTrendPosition(tradeData.trend_position || '');
          setHoldingTimeMins(tradeData.holding_time_mins !== null ? tradeData.holding_time_mins.toString() : '');
          setInvestment(tradeData.investment !== null ? tradeData.investment.toString() : '');
          setRisk(tradeData.risk !== null ? tradeData.risk.toString() : '');
          setPnl(tradeData.pnl !== null ? tradeData.pnl.toString() : '');
          setMaxDrawdown(tradeData.max_drawdown !== null ? tradeData.max_drawdown.toString() : '');
          setQuantity(tradeData.quantity !== null ? tradeData.quantity.toString() : '');
          setPoints(tradeData.points !== null ? tradeData.points.toString() : '');
          setFees(tradeData.fees !== null ? tradeData.fees.toString() : '0');
          setProfitTarget(tradeData.profit_target !== null ? tradeData.profit_target.toString() : '');
          setStopLossPrice(tradeData.stop_loss_price !== null ? tradeData.stop_loss_price.toString() : '');
          setMae(tradeData.mae !== null ? tradeData.mae.toString() : '');
          setMfe(tradeData.mfe !== null ? tradeData.mfe.toString() : '');
          setExecutionStatus(tradeData.execution_status || null);
          setMistakeType(tradeData.mistake_type || '');
          setMistakeText(tradeData.mistake_text || '');
          setTradeRating(tradeData.trade_rating || 0);
          setNotes(tradeData.notes || '');
          setTradeVideoUrl(tradeData.trade_video_url || '');

          setExistingChartImageUrl(tradeData.chart_image_url || null);
          setExistingPlanUrl(tradeData.trade_plan_url || null);
        } else {
          // Failure to obtain core trade details
          showError('Could not load original trade configurations.');
        }

        const entryRulesFromDb = allRules
          .filter((r) => r.rule_type === 'entry')
          .map((r) => ({
            id: r.rule_id, 
            rule_id: r.rule_id,
            rule_type: 'entry' as const,
            rule_order: r.rule_order,
            rule_text: r.rule_text,
            followed: r.followed,
          }));

        const exitRulesFromDb = allRules
          .filter((r) => r.rule_type === 'exit')
          .map((r) => ({
            id: r.rule_id,
            rule_id: r.rule_id,
            rule_type: 'exit' as const,
            rule_order: r.rule_order,
            rule_text: r.rule_text,
            followed: r.followed,
          }));

        setEntryRules(entryRulesFromDb);
        setExitRules(exitRulesFromDb);

        if (psychData) {
          setExternalStress(psychData.external_stress_pct ?? 0);
          setPriceActionReading(psychData.price_action_reading_pct ?? 0);
          setConfidence(psychData.confidence_pct ?? 0);
          setEntryLevels(psychData.entry_levels_pct ?? 0);
          setAnxiety(psychData.anxiety_pct ?? 0);
          setFear(psychData.fear_pct ?? 0);
        }

        if (riskData) {
          setDecidedRisk(riskData.decided_risk !== null ? riskData.decided_risk.toString() : '');
          setFollowedRiskRulesPct(riskData.followed_risk_rules_pct ?? 100);
        }

      } catch (err: any) {
        showError('Could not load original trade configurations.');
      } finally {
        setLoading(false);
      }
    };

    fetchTradeForEdit();
  }, [userId, id]);

  // Load strategy entry/exit checklists on Strategy selection
  const handleStrategyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setStrategyId(selectedId);

    if (!selectedId) {
      setEntryRules([]);
      setExitRules([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('strategy_rules')
        .select('*')
        .eq('strategy_id', selectedId)
        .eq('user_id', userId)
        .order('rule_type')
        .order('rule_order', { ascending: true });

      if (error) throw error;

      if (data) {
        const entry = data
          .filter((r) => r.rule_type === 'entry')
          .map((r) => ({
            id: r.id,
            rule_id: r.id,
            rule_type: r.rule_type as 'entry' | 'exit',
            rule_order: r.rule_order,
            rule_text: r.rule_text,
            followed: null,
          }));

        const exit = data
          .filter((r) => r.rule_type === 'exit')
          .map((r) => ({
            id: r.id,
            rule_id: r.id,
            rule_type: r.rule_type as 'entry' | 'exit',
            rule_order: r.rule_order,
            rule_text: r.rule_text,
            followed: null,
          }));

        setEntryRules(entry);
        setExitRules(exit);
      }
    } catch (err: any) {
      console.error('Error fetching rules:', err);
      showError(err.message || 'Failed loading strategy rules.');
    }
  };

  // Rule checklists toggle callback
  const handleRuleToggle = (ruleId: string, followed: boolean | null) => {
    setEntryRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, followed } : r))
    );
    setExitRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, followed } : r))
    );
  };

  // Cascading error state for mistakes picker
  useEffect(() => {
    if (mistakeType === 'No Mistake') {
      setMistakeText('Clean trade execution');
    } else if (mistakeType === '') {
      setMistakeText('');
    }
  }, [mistakeType]);

  // --- Calculations section ---
  const calculatedStatus = (() => {
    if (pnl === '') return null;
    const v = parseFloat(pnl);
    if (v > 0) return 'Win';
    if (v < 0) return 'Loss';
    return 'Breakeven';
  })();

  const calculatedRMultiple = (() => {
    if (pnl !== '' && risk !== '') {
      const p = parseFloat(pnl);
      const r = parseFloat(risk);
      if (r !== 0) return p / r;
    }
    return null;
  })();

  const calculatedPlannedR = (() => {
    return null;
  })();

  const calculatedRoi = (() => {
    if (pnl !== '' && investment !== '') {
      const p = parseFloat(pnl);
      const i = parseFloat(investment);
      if (i !== 0) return (p / i) * 100;
    }
    return null;
  })();

  const calculatedRor = (() => {
    if (risk !== '' && investment !== '') {
      const r = parseFloat(risk);
      const i = parseFloat(investment);
      if (i !== 0) return (r / i) * 100;
    }
    return null;
  })();

  const calculatedMddPct = (() => {
    if (maxDrawdown !== '' && investment !== '') {
      const m = parseFloat(maxDrawdown);
      const i = parseFloat(investment);
      if (i !== 0) return (m / i) * 100;
    }
    return null;
  })();

  const calculatedPeriod = (() => {
    if (!date) return '—';
    try {
      const d = new Date(date);
      const m = d.toLocaleString('en-US', { month: 'short' });
      const y = d.getFullYear();
      return `${m} ${y}`;
    } catch {
      return '—';
    }
  })();

  // Technical Score calculation
  const totalChecklistRules = entryRules.length + exitRules.length;
  const answeredRulesYCount =
    entryRules.filter((r) => r.followed === true).length +
    exitRules.filter((r) => r.followed === true).length;
  const technicalScore =
    totalChecklistRules > 0 ? (answeredRulesYCount / totalChecklistRules) * 100 : 0;

  // Psychology Composite score
  const psychScore =
    (externalStress +
      priceActionReading +
      confidence +
      entryLevels +
      (100 - anxiety) +
      (100 - fear)) /
    6;

  // Overall Score composite
  const overallScore = (technicalScore + psychScore + followedRiskRulesPct) / 3;

  // File loading methods
  const handleChartFileChange = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showError('Chart image must be under 10MB.');
      return;
    }
    setChartImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setChartImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePlanFileChange = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showError('Trade plan file must be under 10MB.');
      return;
    }
    setTradePlanFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTradePlanPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setTradePlanPreview(null); // PDF file fallback text representation handles this
    }
  };

  // Drag handlings
  const handleDragChart = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveChart(true);
    } else if (e.type === 'dragleave') {
      setDragActiveChart(false);
    }
  };

  const handleDropChart = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveChart(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleChartFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragPlan = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActivePlan(true);
    } else if (e.type === 'dragleave') {
      setDragActivePlan(false);
    }
  };

  const handleDropPlan = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivePlan(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePlanFileChange(e.dataTransfer.files[0]);
    }
  };

  async function generateAndSaveEmbedding(tradeId: string, imageUrl: string, trade: {
    strategy_id: string | null;
    status: 'Win' | 'Loss' | 'Breakeven' | null;
    execution_status: string | null;
    trade_rating: number | null;
    strategyName: string | null;
  }) {
    if (!imageUrl || !userId) return; // No image or no user, skip
    
    try {
      setEmbeddingStatus('loading-model');
      setEmbeddingProgress(0);
      
      // Generate embedding
      setEmbeddingStatus('generating');
      const embedding = await generateEmbeddingFromUrl(imageUrl, (pct) => {
        setEmbeddingProgress(pct);
      });
      
      setEmbeddingStatus('saving');
      
      // Build the visual embedding record
      const embeddingRecord = {
        trade_id: tradeId,
        user_id: userId,
        strategy_id: trade.strategy_id || null,
        image_url: imageUrl,
        embedding: embedding, // Array of 512 numbers
        outcome: trade.status || null,
        execution_status: trade.execution_status || null,
        trade_rating: trade.trade_rating || null,
        technical_score: null, 
        psychology_score: null,
        risk_score: null,
        setup_name: trade.strategyName || null, 
        ict_tags: []
      };
      
      const { error } = await supabase
        .from('trade_visual_embeddings')
        .insert(embeddingRecord);
      
      if (error) throw error;
      
      setEmbeddingStatus('done');
      setEmbeddingProgress(100);
      
    } catch (err) {
      console.error('Embedding generation failed:', err);
      setEmbeddingStatus('error');
      // IMPORTANT: Do NOT throw — trade is already saved, embedding is optional
    }
  }

  // Save/Update Trade Submission
  const handleSaveTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date.trim() || !symbol.trim()) {
      showError('Date and Symbol are required * before logging.');
      return;
    }
    if (!direction) {
      showError('Direction is a required field.');
      return;
    }

    try {
      setSaving(true);

      // Calculations pre-pack
      const tradeDate = new Date(date);
      const parsedMonth = tradeDate.toLocaleString('en-US', { month: 'short' });
      const parsedYear = tradeDate.getFullYear();

      const r_multiple =
        pnl !== '' && risk !== '' && parseFloat(risk) !== 0
          ? parseFloat(pnl) / parseFloat(risk)
          : null;

      const trade_status =
        pnl === ''
          ? null
          : parseFloat(pnl) > 0
          ? 'Win'
          : parseFloat(pnl) < 0
          ? 'Loss'
          : 'Breakeven';

      const roi_val =
        pnl !== '' && investment !== '' && parseFloat(investment) !== 0
          ? (parseFloat(pnl) / parseFloat(investment)) * 100
          : null;

      const ror_val =
        risk !== '' && investment !== '' && parseFloat(investment) !== 0
          ? (parseFloat(risk) / parseFloat(investment)) * 100
          : null;

      const mdd_val =
        maxDrawdown !== '' && investment !== '' && parseFloat(investment) !== 0
          ? (parseFloat(maxDrawdown) / parseFloat(investment)) * 100
          : null;

      let targetTradeId = id;

      if (isEditMode && id) {
        // 1. UPDATE Core Trade Row
        const { error: tradeError } = await supabase
          .from('trades')
          .update({
            strategy_id: strategyId || null,
            date: date,
            symbol: symbol.toUpperCase().trim(),
            direction: direction,
            option_type: optionType,
            risk: risk !== '' ? parseFloat(risk) : null,
            investment: investment !== '' ? parseFloat(investment) : null,
            pnl: pnl !== '' ? parseFloat(pnl) : null,
            r_multiple: r_multiple,
            status: trade_status,
            max_drawdown: maxDrawdown !== '' ? parseFloat(maxDrawdown) : null,
            mdd_pct: mdd_val,
            ror: ror_val,
            roi: roi_val,
            quantity: quantity !== '' ? parseFloat(quantity) : null,
            points: points !== '' ? parseFloat(points) : null,
            holding_time_mins: holdingTimeMins !== '' ? parseInt(holdingTimeMins, 10) : null,
            opening_condition: openingCondition || null,
            trend_position: trendPosition || null,
            entry_time: entryTime || null,
            hourly_trend: hourlyTrend || null,
            phase: phase || null,
            execution_status: executionStatus || null,
            mistake_type: mistakeType || null,
            mistake_text: mistakeText || null,
            trade_rating: tradeRating > 0 ? tradeRating : null,
            notes: notes.trim() || null,
            trade_video_url: tradeVideoUrl.trim() || null,
            fees: fees !== '' ? parseFloat(fees) : 0,
            profit_target: profitTarget !== '' ? parseFloat(profitTarget) : null,
            stop_loss_price: stopLossPrice !== '' ? parseFloat(stopLossPrice) : null,
            mae: mae !== '' ? parseFloat(mae) : null,
            mfe: mfe !== '' ? parseFloat(mfe) : null,
            planned_r_multiple: calculatedPlannedR,
            month: parsedMonth,
            year: parsedYear,
            needs_review: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('user_id', userId);

        if (tradeError) throw tradeError;

        // 2. Clear & Reset Rules adherence
        await supabase
          .from('trade_rule_adherence')
          .delete()
          .eq('trade_id', id)
          .eq('user_id', userId);

      } else {
        // Create Mode Core Trade Row Insertion
        const { data: newTrade, error: tradeError } = await supabase
          .from('trades')
          .insert({
            user_id: userId,
            strategy_id: strategyId || null,
            date: date,
            symbol: symbol.toUpperCase().trim(),
            direction: direction,
            option_type: optionType,
            risk: risk !== '' ? parseFloat(risk) : null,
            investment: investment !== '' ? parseFloat(investment) : null,
            pnl: pnl !== '' ? parseFloat(pnl) : null,
            r_multiple: r_multiple,
            status: trade_status,
            max_drawdown: maxDrawdown !== '' ? parseFloat(maxDrawdown) : null,
            mdd_pct: mdd_val,
            ror: ror_val,
            roi: roi_val,
            quantity: quantity !== '' ? parseFloat(quantity) : null,
            points: points !== '' ? parseFloat(points) : null,
            holding_time_mins: holdingTimeMins !== '' ? parseInt(holdingTimeMins, 10) : null,
            opening_condition: openingCondition || null,
            trend_position: trendPosition || null,
            entry_time: entryTime || null,
            hourly_trend: hourlyTrend || null,
            phase: phase || null,
            execution_status: executionStatus || null,
            mistake_type: mistakeType || null,
            mistake_text: mistakeText || null,
            trade_rating: tradeRating > 0 ? tradeRating : null,
            notes: notes.trim() || null,
            trade_video_url: tradeVideoUrl.trim() || null,
            chart_image_url: null,
            trade_plan_url: null,
            fees: fees !== '' ? parseFloat(fees) : 0,
            profit_target: profitTarget !== '' ? parseFloat(profitTarget) : null,
            stop_loss_price: stopLossPrice !== '' ? parseFloat(stopLossPrice) : null,
            mae: mae !== '' ? parseFloat(mae) : null,
            mfe: mfe !== '' ? parseFloat(mfe) : null,
            planned_r_multiple: calculatedPlannedR,
            month: parsedMonth,
            year: parsedYear,
          })
          .select()
          .single();

        if (tradeError) throw tradeError;
        targetTradeId = newTrade.id;
      }

      // 3. Re-Insert Rule Adherence table stats
      const allRulesToLog = [
        ...entryRules.map((r) => ({
          trade_id: targetTradeId,
          user_id: userId,
          date: date,
          rule_id: r.rule_id || r.id,
          rule_type: 'entry',
          rule_order: r.rule_order,
          rule_text: r.rule_text,
          followed: r.followed === true,
        })),
        ...exitRules.map((r) => ({
          trade_id: targetTradeId,
          user_id: userId,
          date: date,
          rule_id: r.rule_id || r.id,
          rule_type: 'exit',
          rule_order: r.rule_order,
          rule_text: r.rule_text,
          followed: r.followed === true,
        })),
      ];

      if (allRulesToLog.length > 0) {
        const { error: rulesError } = await supabase
          .from('trade_rule_adherence')
          .insert(allRulesToLog);
        if (rulesError) console.error('Rules logging failed:', rulesError);
      }

      // Calculate psychScore explicitly to ensure correct values
      const calculatedPsychScore = (
        externalStress +
        priceActionReading +
        confidence +
        entryLevels +
        (100 - anxiety) +
        (100 - fear)
      ) / 6;

      const parsedDecidedRisk =
        decidedRisk !== ''
          ? parseFloat(decidedRisk)
          : risk !== ''
          ? parseFloat(risk)
          : null;

      console.log('Trade psychology slider values and calculated score being saved:', {
        tradeId: targetTradeId,
        userId: userId,
        externalStress,
        priceActionReading,
        confidence,
        entryLevels,
        anxiety,
        fear,
        calculatedPsychScore
      });

      console.log('Trade risk management values being saved:', {
        tradeId: targetTradeId,
        userId: userId,
        decidedRiskValue: parsedDecidedRisk,
        followedRiskRulesPct
      });

      // 4. Upsert Psychology Row
      const { error: psychError } = await supabase
        .from('trade_psychology')
        .upsert({
          trade_id: targetTradeId,
          user_id: userId,
          date: date,
          external_stress_pct: externalStress,
          price_action_reading_pct: priceActionReading,
          confidence_pct: confidence,
          entry_levels_pct: entryLevels,
          anxiety_pct: anxiety,
          fear_pct: fear,
          psychological_condition_pct: calculatedPsychScore
        }, {
          onConflict: 'trade_id,user_id',
          ignoreDuplicates: false
        });
      if (psychError) console.error('Psychology insertion failed:', psychError);

      // 5. Upsert Risk Management Row
      const { error: riskError } = await supabase
        .from('trade_risk_management')
        .upsert({
          trade_id: targetTradeId,
          user_id: userId,
          date: date,
          decided_risk: parsedDecidedRisk,
          followed_risk_rules_pct: followedRiskRulesPct
        }, {
          onConflict: 'trade_id,user_id',
          ignoreDuplicates: false
        });
      if (riskError) console.error('Risk management record failed:', riskError);

      // Storage assets staging paths configs
      let updatedChartUrl = existingChartImageUrl;
      let updatedPlanUrl = existingPlanUrl;

      // Handle removals first if requested in edit mode
      if (isEditMode) {
        if (chartRemoved && existingChartImageUrl) {
          const parts = existingChartImageUrl.split('/trade-media/');
          if (parts.length > 1) {
            await supabase.storage.from('trade-media').remove([decodeURIComponent(parts[1])]);
          }
          updatedChartUrl = null;
        }

        if (planRemoved && existingPlanUrl) {
          const parts = existingPlanUrl.split('/trade-media/');
          if (parts.length > 1) {
            await supabase.storage.from('trade-media').remove([decodeURIComponent(parts[1])]);
          }
          updatedPlanUrl = null;
        }
      }

      // Handle new uploads
      if (chartImageFile) {
        // Delete old file if present
        if (existingChartImageUrl) {
          const parts = existingChartImageUrl.split('/trade-media/');
          if (parts.length > 1) {
            await supabase.storage.from('trade-media').remove([decodeURIComponent(parts[1])]);
          }
        }

        const ext = chartImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const sanitizedExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
        const chartPath = `chart-screenshots/${userId}/${parsedYear}/${parsedMonth}/${targetTradeId}_${Date.now()}.${sanitizedExt}`;
        
        const { error: uploadChartError } = await supabase.storage
          .from('trade-media')
          .upload(chartPath, chartImageFile);

        if (!uploadChartError) {
          const { data: { publicUrl } } = supabase.storage
            .from('trade-media')
            .getPublicUrl(chartPath);
          updatedChartUrl = publicUrl;
        } else {
          console.error('Chart upload error:', uploadChartError);
        }
      }

      if (tradePlanFile) {
        // Delete old plan file if present
        if (existingPlanUrl) {
          const parts = existingPlanUrl.split('/trade-media/');
          if (parts.length > 1) {
            await supabase.storage.from('trade-media').remove([decodeURIComponent(parts[1])]);
          }
        }

        const sanitizedFileName = tradePlanFile.name
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9._-]/g, '');
        const planPath = `trade-plans/${userId}/${parsedYear}/${parsedMonth}/${targetTradeId}_${Date.now()}_${sanitizedFileName}`;

        const { error: uploadPlanError } = await supabase.storage
          .from('trade-media')
          .upload(planPath, tradePlanFile);

        if (!uploadPlanError) {
          const { data: { publicUrl } } = supabase.storage
            .from('trade-media')
            .getPublicUrl(planPath);
          updatedPlanUrl = publicUrl;
        } else {
          console.error('Plan upload error:', uploadPlanError);
        }
      }

      // Update URLs back into trade table
      const updates: Record<string, string | boolean | null> = {};
      updates.chart_image_url = updatedChartUrl;
      updates.trade_plan_url = updatedPlanUrl;
      updates.needs_review = false;

      await supabase
        .from('trades')
        .update(updates)
        .eq('id', targetTradeId)
        .eq('user_id', userId);

      if (isEditMode && (chartRemoved || chartImageFile)) {
        await supabase
          .from('trade_visual_embeddings')
          .delete()
          .eq('trade_id', targetTradeId)
          .eq('user_id', userId);
      }

      if (chartImageFile && updatedChartUrl) {
        const selectedStrategyName = strategies.find((s) => s.id === strategyId)?.name || null;
        // Don't await — run in background
        generateAndSaveEmbedding(targetTradeId, updatedChartUrl, {
          strategy_id: strategyId || null,
          status: trade_status,
          execution_status: executionStatus || null,
          trade_rating: tradeRating > 0 ? tradeRating : null,
          strategyName: selectedStrategyName
        });
      }

      showSuccess(isEditMode ? 'Trade updated successfully!' : 'Trade logged successfully!');
      
      if (isEditMode) {
        navigate(`/trading-logs/${targetTradeId}`);
      } else {
        handleResetForm();
        navigate(`/trading-logs/${targetTradeId}`);
      }
    } catch (err: any) {
      console.error('Error saving trade:', err);
      showError(err.message || 'Error occurred while saving transaction.');
    } finally {
      setSaving(false);
    }
  };

  // Reset entire state variables back to defaults
  const handleResetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setEntryTime('');
    setSymbol('');
    setDirection(null);
    setOptionType(null);
    setStrategyId('');
    setOpeningCondition('');
    setHourlyTrend(null);
    setPhase('');
    setTrendPosition('');
    setHoldingTimeMins('');

    setInvestment('');
    setRisk('');
    setPnl('');
    setMaxDrawdown('');
    setQuantity('');
    setPoints('');
    setFees('0');
    setEntryPrice('');
    setProfitTarget('');
    setStopLossPrice('');
    setMae('');
    setMfe('');

    setEntryRules([]);
    setExitRules([]);

    setExecutionStatus(null);
    setMistakeType('');
    setMistakeText('');
    setTradeRating(0);
    setNotes('');

    setExternalStress(0);
    setPriceActionReading(0);
    setConfidence(0);
    setEntryLevels(0);
    setAnxiety(0);
    setFear(0);

    setDecidedRisk('');
    setFollowedRiskRulesPct(100);

    setChartImageFile(null);
    setChartImagePreview(null);
    setTradeVideoUrl('');
    setTradePlanFile(null);
    setTradePlanPreview(null);
  };

  // Render auth or fallback spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans selection:bg-indigo-500/30" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT SIDE MAIN CONTAINER */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
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
        <main className="flex-1 overflow-y-auto px-0">
          <form onSubmit={handleSaveTradeSubmit} className="max-w-6xl mx-auto">
            {/* PAGE HEADER */}
            <div
              style={{
                background: 'var(--card)',
                width: 'calc(100% + 48px)',
                marginLeft: '-24px',
                marginRight: '-24px',
                paddingTop: '3px',
                paddingBottom: '3px',
                paddingLeft: '24px',
                paddingRight: '24px',
                borderRadius: 0,
                boxShadow: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {isEditMode && (
                  <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-500 mb-2">
                    <Link to="/trading-logs" style={{ color: 'var(--text-sub)' }} className="hover:text-[var(--accent)] transition-colors">TRADING LOGS</Link>
                    <span>/</span>
                    <Link to={`/trading-logs/${id}`} style={{ color: 'var(--text-sub)' }} className="hover:text-[var(--accent)] transition-colors">TRADE AUDIT</Link>
                    <span>/</span>
                    <span className="text-zinc-300">EDIT</span>
                  </div>
                )}
                <h1 className="font-display" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                  {isEditMode ? 'Edit Trade' : 'Log Trade'}
                </h1>
              </div>

              <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                <div className="flex items-center gap-3">
                  {isEditMode && (
                    <Link 
                      to={`/trading-logs/${id}`}
                      style={{
                        backgroundColor: 'var(--bar)',
                        border: '0.5px solid var(--border)',
                        color: 'var(--text-sub)',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      className="w-full sm:w-auto transition-all text-center"
                    >
                      Cancel
                    </Link>
                  )}
                  <button
                    type="submit"
                    disabled={saving || !date.trim() || !symbol.trim()}
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      width: '100%'
                    }}
                    className="w-full hover:opacity-90 disabled:opacity-50 transition-all font-display shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{isEditMode ? 'Updating...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{isEditMode ? 'Update Trade' : 'Save Trade'}</span>
                      </>
                    )}
                  </button>
                </div>
                {embeddingStatus && embeddingStatus !== 'done' && (
                  <div className="mt-3 bg-[#0F1117] border border-[#2A2D3A] rounded-lg px-4 py-3 w-full sm:w-80 text-left">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />
                      <span className="text-xs text-gray-400">
                        {embeddingStatus === 'loading-model' && `Loading AI Vision model... ${embeddingProgress > 0 ? embeddingProgress + '%' : ''}`}
                        {embeddingStatus === 'generating' && 'Analyzing chart pattern...'}
                        {embeddingStatus === 'saving' && 'Saving to visual library...'}
                        {embeddingStatus === 'error' && 'Visual embedding failed (trade saved successfully)'}
                      </span>
                    </div>
                    {embeddingStatus === 'loading-model' && embeddingProgress > 0 && (
                      <div className="mt-2 bg-[#2A2D3A] rounded-full h-1.5 w-full">
                        <div className="bg-indigo-600 rounded-full h-1.5 transition-all" style={{width: embeddingProgress + '%'}} />
                      </div>
                    )}
                  </div>
                )}
                {embeddingStatus === 'done' && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Chart added to visual library ✓
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-zinc-400 mt-4">
              {isEditMode 
                ? 'Modify transaction parameters, rules adherence, scores and media contents.' 
                : 'Record your complete trade — rules, psychology, execution, and media.'}
            </p>

            <div className="border-b border-zinc-800/80 mt-5 mb-8" />

            {/* THREE-COLUMN LAYOUT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* LEFT COLUMN (COL SPAN 2): Form Fields Cards 1-6 */}
              <div className="lg:col-span-2 space-y-3">
                {/* CARD 1: TRADE DETAILS */}
                <section style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', padding: '16px 20px' }} className="relative overflow-hidden">
                  <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: '600', textTransform: 'none' }} className="font-display tracking-tight mb-4">
                    Trade Details
                  </h2>

                  <div className="space-y-3">
                    {/* Date and Entry Time row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Date <span className="text-[var(--accent)]">*</span>
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                          required
                        />
                      </div>
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Entry Time
                        </label>
                        <input
                          type="time"
                          value={entryTime}
                          onChange={(e) => setEntryTime(e.target.value)}
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)] font-mono"
                        />
                      </div>
                    </div>

                    {/* Symbol, Direction, and Option Type row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative" ref={symbolContainerRef}>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Symbol <span className="text-[var(--accent)]">*</span>
                        </label>
                        <input
                          type="text"
                          value={symbol}
                          onChange={(e) => {
                            setSymbol(e.target.value.toUpperCase());
                            setShowSymbolSuggestions(true);
                          }}
                          onFocus={() => setShowSymbolSuggestions(true)}
                          placeholder="e.g. XAUUSD, BANKNIFTY"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)] font-mono"
                          required
                        />

                        {/* Autocomplete Dropdown */}
                        {showSymbolSuggestions && symbolSuggestions.length > 0 && (
                          <div 
                            style={{ 
                              backgroundColor: 'var(--card)', 
                              borderColor: 'var(--border)',
                              borderRadius: '8px'
                            }} 
                            className="absolute left-0 right-0 mt-1 border shadow-xl z-50 overflow-hidden font-mono text-[13px]"
                          >
                            {symbolSuggestions.map((sym) => (
                              <div
                                key={sym}
                                onClick={() => {
                                  setSymbol(sym);
                                  setShowSymbolSuggestions(false);
                                }}
                                style={{ color: 'var(--text)' }}
                                className="px-[14px] py-[10px] cursor-pointer hover:bg-[var(--row)] transition-colors"
                              >
                                {getHighlightedText(sym, symbol)}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Non-standard symbol warning */}
                        {isSymbolNonStandard && (
                          <p className="mt-1.5 text-amber-500 text-[10px] leading-tight font-sans">
                            This symbol is not in our standard list. Verify spelling before saving.
                          </p>
                        )}
                      </div>
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          DIRECTION <span className="text-[var(--accent)]">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 font-sans">
                          {(['LONG', 'SHORT'] as const).map((dir) => {
                            const isSel = direction === dir;
                            
                            const defaultStyle = {
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-sub)',
                              borderRadius: '8px',
                              padding: '8px 16px'
                            };

                            const activeStyle = dir === 'LONG' ? {
                              backgroundColor: 'rgba(34,197,94,0.12)',
                              border: '1px solid #22c55e',
                              color: '#22c55e',
                              fontWeight: 600,
                              borderRadius: '8px',
                              padding: '8px 16px'
                            } : {
                              backgroundColor: 'rgba(239,68,68,0.12)',
                              border: '1px solid #ef4444',
                              color: '#ef4444',
                              fontWeight: 600,
                              borderRadius: '8px',
                              padding: '8px 16px'
                            };

                            return (
                              <button
                                key={dir}
                                type="button"
                                onClick={() => setDirection(dir)}
                                style={isSel ? activeStyle : defaultStyle}
                                className="text-[12px] text-center cursor-pointer transition-all"
                              >
                                {dir}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          OPTION TYPE
                        </label>
                        <div className="grid grid-cols-3 gap-1.5 font-sans">
                          {(['NONE', 'CALL', 'PUT'] as const).map((opt) => {
                            const isSelected = opt === 'NONE' ? optionType === null : optionType === opt;
                            
                            const defaultStyle = {
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-sub)',
                              borderRadius: '8px',
                              padding: '8px 16px'
                            };

                            const activeStyle = {
                              backgroundColor: 'rgba(30,41,59,0.12)',
                              border: '1px solid #1e293b',
                              color: '#1e293b',
                              fontWeight: 650, // 600
                              borderRadius: '8px',
                              padding: '8px 16px'
                            };

                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setOptionType(opt === 'NONE' ? null : opt)}
                                style={isSelected ? activeStyle : defaultStyle}
                                className="text-[12px] text-center cursor-pointer transition-all"
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Strategy Setup Selection */}
                    <div>
                      <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                        Strategy / Setup
                      </label>
                      <select
                        value={strategyId}
                        onChange={handleStrategyChange}
                        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                        className="focus:border-[var(--accent)] w-full focus:outline-none"
                      >
                        <option value="" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>— No Setup / Select Strategy —</option>
                        {strategies.map((st) => (
                          <option key={st.id} value={st.id} style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>
                            #{st.sr_no} {st.name} ({st.type_of_strategy})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Opening conditions row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Opening Condition
                        </label>
                        <select
                          value={openingCondition}
                          onChange={(e) => setOpeningCondition(e.target.value)}
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none"
                        >
                          <option value="" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>— Select —</option>
                          <option value="London Open" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>London Open</option>
                          <option value="NY Open" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>NY Open</option>
                          <option value="Asian Session" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Asian Session</option>
                          <option value="Killzone" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Killzone</option>
                          <option value="Pre-Market" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Pre-Market</option>
                          <option value="Mid-Day" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Mid-Day</option>
                          <option value="Other" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Other</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Hourly Trend
                        </label>
                        <div className="grid grid-cols-3 gap-1 font-sans">
                          {(['UP', 'DOWN', 'CONSOLIDATION'] as const).map((trend) => {
                            const isSel = hourlyTrend === trend;
                            
                            const defaultStyle = {
                              backgroundColor: 'transparent',
                              border: '0.5px solid var(--border)',
                              color: 'var(--text-sub)'
                            };

                            const activeStyle = {
                              backgroundColor: 'var(--accent-muted)',
                              border: '1px solid var(--accent)',
                              color: 'var(--accent)'
                            };

                            return (
                              <button
                                key={trend}
                                type="button"
                                onClick={() => setHourlyTrend(hourlyTrend === trend ? null : trend)}
                                style={isSel ? activeStyle : defaultStyle}
                                className="rounded-lg py-2 px-1 text-[11px] font-semibold text-center cursor-pointer transition-all border truncate"
                              >
                                {trend === 'CONSOLIDATION' ? 'BE/RNG' : trend}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Phase (PO3)
                        </label>
                        <select
                          value={phase}
                          onChange={(e) => setPhase(e.target.value)}
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none"
                        >
                          <option value="" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>— Select —</option>
                          <option value="Accumulation" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Accumulation</option>
                          <option value="Manipulation" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Manipulation</option>
                          <option value="Distribution" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Distribution</option>
                        </select>
                      </div>
                    </div>

                    {/* Trend Position and Holding times */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Trend Position
                        </label>
                        <select
                          value={trendPosition}
                          onChange={(e) => setTrendPosition(e.target.value)}
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none"
                        >
                          <option value="" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>— Select —</option>
                          <option value="Trend Starting" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Trend Starting</option>
                          <option value="Trend Middle" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Trend Middle</option>
                          <option value="Trend Ending" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Trend Ending</option>
                          <option value="Ranging" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Ranging</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Holding Time (mins)
                        </label>
                        <input
                          type="number"
                          id="holdingTimeMins"
                          min="0"
                          value={holdingTimeMins}
                          onChange={(e) => setHoldingTimeMins(e.target.value)}
                          placeholder="e.g. 45"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* CARD 2: FINANCIAL DATA */}
                <section style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', padding: '16px 20px' }} className="relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: '600', textTransform: 'none' }} className="font-display tracking-tight">
                      Financial Data
                    </h2>
                    <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono tracking-widest uppercase">
                      (₹ Indian Rupees)
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Investment (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={investment}
                          onChange={(e) => setInvestment(e.target.value)}
                          placeholder="deployed capital"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Risk (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={risk}
                          onChange={(e) => setRisk(e.target.value)}
                          placeholder="max risk amount"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Net P&L (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={pnl}
                          onChange={(e) => setPnl(e.target.value)}
                          placeholder="negative for loss"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', padding: '8px 12px' }}
                          className={`focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)] ${
                            pnl === ''
                              ? 'text-[var(--text)]'
                              : parseFloat(pnl) > 0
                              ? 'text-[#22c55e] font-bold'
                              : parseFloat(pnl) < 0
                              ? 'text-[#ef4444] font-bold'
                              : 'text-[var(--text-muted)]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Max Drawdown (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={maxDrawdown}
                          onChange={(e) => setMaxDrawdown(e.target.value)}
                          placeholder="worst adverse amount"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Qty / Lots
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="0.00"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Points / Pips
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={points}
                          onChange={(e) => setPoints(e.target.value)}
                          placeholder="0.00"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Entry Price (₹)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={entryPrice}
                          onChange={(e) => setEntryPrice(e.target.value)}
                          placeholder="average entry price"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Profit Target (₹)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={profitTarget}
                          onChange={(e) => setProfitTarget(e.target.value)}
                          placeholder="profit target price"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Stop Loss Price (₹)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={stopLossPrice}
                          onChange={(e) => setStopLossPrice(e.target.value)}
                          placeholder="stop loss price"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>
                    </div>

                    {/* Row 4 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          MAE (Worst Price Against You) (₹)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={mae}
                          onChange={(e) => setMae(e.target.value)}
                          placeholder="max adverse excursion"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          MFE (Best Price In Favor) (₹)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={mfe}
                          onChange={(e) => setMfe(e.target.value)}
                          placeholder="max favorable excursion"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Brokerage / Fees (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={fees}
                          onChange={(e) => setFees(e.target.value)}
                          placeholder="0.00"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* CARD 3: AUTO-CALCULATED RESULTS */}
                <section style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', padding: '16px 20px' }} className="relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: '600', textTransform: 'none' }} className="font-display tracking-tight">
                      Auto-Calculated
                    </h2>
                    <span style={{ color: 'var(--text-muted)' }} className="text-xs animate-pulse flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" style={{ backgroundColor: 'var(--accent)' }} />
                      Updates as you type
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Trade Status Badge Cell */}
                    <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)' }} className="flex flex-col items-center justify-center p-3 rounded-lg text-center min-h-[85px]">
                      {calculatedStatus === 'Win' && (
                        <span className="bg-green-100 border border-green-400 text-green-700 text-xs font-extrabold px-3 py-1.5 rounded uppercase tracking-wider w-full">
                          ✓ WIN
                        </span>
                      )}
                      {calculatedStatus === 'Loss' && (
                        <span className="bg-red-100 border border-red-400 text-red-700 text-xs font-extrabold px-3 py-1.5 rounded uppercase tracking-wider w-full">
                          ✗ LOSS
                        </span>
                      )}
                      {calculatedStatus === 'Breakeven' && (
                        <span className="bg-zinc-100 border border-zinc-400 text-zinc-650 text-xs font-extrabold px-3 py-1.5 rounded uppercase tracking-wider w-full">
                          — BE
                        </span>
                      )}
                      {calculatedStatus === null && (
                        <span style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }} className="border text-xs px-3 py-1.5 rounded uppercase tracking-wider w-full opacity-60">
                          Status
                        </span>
                      )}
                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase tracking-widest font-bold mt-1.5">
                        Status
                      </span>
                    </div>

                    {/* R Multiple */}
                    <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)' }} className="flex flex-col items-center justify-center p-3 rounded-lg text-center min-h-[85px]">
                      <span
                        className={`text-xl font-black font-display ${
                          calculatedRMultiple === null
                            ? 'text-zinc-400'
                            : calculatedRMultiple > 0
                            ? 'text-[#22c55e]'
                            : calculatedRMultiple < 0
                            ? 'text-[#ef4444]'
                            : 'text-zinc-650'
                        }`}
                      >
                        {calculatedRMultiple !== null
                          ? `${calculatedRMultiple.toFixed(2)}R`
                          : '—'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase tracking-widest font-bold mt-1.5">
                        R-Multiple
                      </span>
                    </div>

                    {/* Planned R-Multiple */}
                    <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)' }} className="flex flex-col items-center justify-center p-3 rounded-lg text-center min-h-[85px]">
                      <span
                        className={`text-xl font-black font-display ${
                          calculatedPlannedR === null
                            ? 'text-zinc-400'
                            : calculatedPlannedR > 0
                            ? 'text-[#22c55e]'
                            : calculatedPlannedR < 0
                            ? 'text-[#ef4444]'
                            : 'text-zinc-650'
                        }`}
                      >
                        {calculatedPlannedR !== null
                          ? `${calculatedPlannedR >= 0 ? '+' : ''}${calculatedPlannedR.toFixed(1)}R`
                          : '—'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase tracking-widest font-bold mt-1.5">
                        Planned R-Multiple
                      </span>
                    </div>

                    {/* ROI% */}
                    <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)' }} className="flex flex-col items-center justify-center p-3 rounded-lg text-center min-h-[85px]">
                      <span
                        className={`text-xl font-black font-display ${
                          calculatedRoi === null
                            ? 'text-zinc-400'
                            : calculatedRoi > 0
                            ? 'text-[#22c55e]'
                            : calculatedRoi < 0
                            ? 'text-[#ef4444]'
                            : 'text-zinc-650'
                        }`}
                      >
                        {calculatedRoi !== null ? `${calculatedRoi.toFixed(2)}%` : '—'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase tracking-widest font-bold mt-1.5">
                        ROI %
                      </span>
                    </div>

                    {/* ROR% */}
                    <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)' }} className="flex flex-col items-center justify-center p-3 rounded-lg text-center min-h-[85px]">
                      <span
                        className={`text-xl font-black font-display ${
                          calculatedRor === null ? 'text-zinc-400' : 'text-amber-600'
                        }`}
                      >
                        {calculatedRor !== null ? `${calculatedRor.toFixed(2)}%` : '—'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase tracking-widest font-bold mt-1.5">
                        Risk %
                      </span>
                    </div>

                    {/* MDD% */}
                    <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)' }} className="flex flex-col items-center justify-center p-3 rounded-lg text-center min-h-[85px]">
                      <span
                        className={`text-xl font-black font-display ${
                          calculatedMddPct === null ? 'text-zinc-400' : 'text-amber-600'
                        }`}
                      >
                        {calculatedMddPct !== null ? `${calculatedMddPct.toFixed(2)}%` : '—'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase tracking-widest font-bold mt-1.5">
                        Max DD %
                      </span>
                    </div>

                    {/* Month Year display Period */}
                    <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)' }} className="flex flex-col items-center justify-center p-3 rounded-lg text-center min-h-[85px]">
                      <span style={{ color: 'var(--text)' }} className="text-xl font-black font-display">
                        {calculatedPeriod}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase tracking-widest font-bold mt-1.5">
                        Period
                      </span>
                    </div>
                  </div>
                </section>

                {/* CARD 4: ENTRY RULES CHECKLIST */}
                <section style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', padding: '16px 20px' }} className="relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: '600', textTransform: 'none' }} className="font-display tracking-tight">
                        Entry Rules
                      </h2>
                      <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-1">
                        Did you follow your entry rules for this trade?
                      </p>
                    </div>

                    {strategyId && (
                      <span
                        className={`border rounded-full px-3.5 py-1 text-xs font-bold tracking-wider font-mono uppercase ${
                          technicalScore >= 70
                            ? 'bg-green-550/10 text-[#22c55e] border-[#22c55e]/20'
                            : technicalScore >= 50
                            ? 'bg-amber-550/10 text-[#f59e0b] border-[#f59e0b]/20'
                            : 'bg-red-550/10 text-[#ef4444] border-[#ef4444]/20'
                        }`}
                      >
                        Technical: {technicalScore.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {isEditMode && (
                    <div style={{ backgroundColor: 'var(--accent-muted)', border: '1px solid var(--accent)', color: 'var(--accent)' }} className="text-xs rounded-lg p-3 mt-2 mb-2 flex items-start gap-2.5">
                      <span className="font-bold text-sm leading-none shrink-0">ℹ️</span>
                      <p className="leading-normal">
                        Showing rules from when this trade was originally logged. Changing the strategy will reload current rules.
                      </p>
                    </div>
                  )}

                  <RuleChecklist
                    rules={entryRules}
                    onChange={handleRuleToggle}
                    ruleType="entry"
                    strategySelected={!!strategyId}
                  />
                </section>

                {/* CARD 5: EXIT RULES CHECKLIST */}
                <section style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', padding: '16px 20px' }} className="relative overflow-hidden">
                  <div className="mb-2">
                    <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: '600', textTransform: 'none' }} className="font-display tracking-tight">
                      Exit Rules
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-1">
                      Did you follow your exit rules for this trade?
                    </p>
                  </div>

                  <RuleChecklist
                    rules={exitRules}
                    onChange={handleRuleToggle}
                    ruleType="exit"
                    strategySelected={!!strategyId}
                  />
                </section>

                {/* CARD 6: EXECUTION QUALITY */}
                <section style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', padding: '16px 20px' }} className="relative overflow-hidden">
                  <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: '600', textTransform: 'none' }} className="font-display tracking-tight mb-4">
                    Execution Quality
                  </h2>

                  <div className="space-y-4">
                    {/* Execution Picker component */}
                    <ExecutionPicker value={executionStatus} onChange={setExecutionStatus} />

                    {/* Type and actual mistake cascading cascade */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Type of Mistake
                        </label>
                        <select
                          value={mistakeType}
                          onChange={(e) => setMistakeType(e.target.value)}
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                          className="focus:border-[var(--accent)] w-full focus:outline-none"
                        >
                          <option value="" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>— Select —</option>
                          <option value="Technical" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Technical</option>
                          <option value="Psychological" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Psychological</option>
                          <option value="Risk Management" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Risk Management</option>
                          <option value="No Mistake" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>No Mistake</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                          Actual Mistake
                        </label>
                        {mistakeType === 'No Mistake' ? (
                          <input
                            type="text"
                            value="Clean trade execution"
                            disabled
                            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text-muted)', padding: '8px 12px' }}
                            className="w-full opacity-60 focus:outline-none"
                          />
                        ) : (
                          <select
                            value={mistakeText}
                            onChange={(e) => setMistakeText(e.target.value)}
                            disabled={!mistakeType}
                            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                            className={`focus:border-[var(--accent)] w-full focus:outline-none ${
                              !mistakeType ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            {!mistakeType ? (
                              <option value="" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>— Select type first —</option>
                            ) : (
                              <>
                                <option value="" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>— Select —</option>
                                {mistakeType === 'Technical' && (
                                  <>
                                    <option value="Early Exit" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Early Exit</option>
                                    <option value="Exit without reason" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Exit without reason</option>
                                    <option value="Ignoring price action" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Ignoring price action</option>
                                    <option value="OB Ignoring & very tight SL" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>OB Ignoring & very tight SL</option>
                                    <option value="Taking trade against the bias" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Taking trade against the bias</option>
                                    <option value="Without setup entry" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Without setup entry</option>
                                    <option value="Wrong entry point" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Wrong entry point</option>
                                    <option value="Wrong SL calculation" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Wrong SL calculation</option>
                                  </>
                                )}
                                {mistakeType === 'Psychological' && (
                                  <>
                                    <option value="Without setup entry (emotional override)" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>
                                      Without setup entry (emotional override)
                                    </option>
                                    <option value="Exit without reason (fear-based)" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>
                                      Exit without reason (fear-based)
                                    </option>
                                    <option value="Taking trade against the bias (FOMO)" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>
                                      Taking trade against the bias (FOMO)
                                    </option>
                                    <option value="Revenge trade after loss" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Revenge trade after loss</option>
                                  </>
                                )}
                                {mistakeType === 'Risk Management' && (
                                  <>
                                    <option value="Small quantity (undersized)" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Small quantity (undersized)</option>
                                    <option value="Very close SL" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Very close SL</option>
                                    <option value="Wrong SL calculation" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Wrong SL calculation</option>
                                    <option value="Oversized position" style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>Oversized position</option>
                                  </>
                                )}
                              </>
                            )}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Star Rating stars interaction rating */}
                    <StarRating rating={tradeRating} onChange={setTradeRating} />

                    {/* Notes textarea text input area */}
                    <div>
                      <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                        Notes / Observations
                      </label>
                      <textarea
                        rows={5}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What happened on this trade? What did you observe? What would you do differently? Key lesson..."
                        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                        className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)] resize-y"
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN (COL SPAN 1): sticky widgets Cards 7-10 */}
              <div className="space-y-4">
                {/* CARD 7: LIVE TRADE SCORE CONTAINER */}
                <section style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', padding: '20px', position: 'sticky', top: '24px' }} className="z-10 transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: '600', textTransform: 'none' }} className="font-display tracking-tight">
                      Trade Score
                    </h2>
                    <span className="bg-green-50 text-green-600 border border-green-200 text-[10px] font-mono tracking-widest uppercase font-bold rounded-full px-2.5 py-0.5 animate-pulse">
                      LIVE
                    </span>
                  </div>

                  <div className="space-y-4 mt-5">
                    {/* Scores Progress elements */}
                    <ScoreBar
                      label="Technical"
                      value={technicalScore}
                      subLabel="Entry + Exit rules followed"
                      fillColor="var(--accent)"
                    />

                    <ScoreBar
                      label="Psychology"
                      value={psychScore}
                      subLabel="Mental state composite"
                      fillColor="var(--accent)"
                    />

                    <ScoreBar
                      label="Risk Management"
                      value={followedRiskRulesPct}
                      subLabel="Risk rules adherence"
                      fillColor="var(--accent)"
                    />

                    <div style={{ borderColor: 'var(--border)' }} className="border-t my-4 pt-4" />

                    {/* Overall composite score display */}
                    <div className="text-center font-sans space-y-1">
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                        Overall Score
                      </div>
                      <div
                        style={{
                          fontSize: '36px',
                          fontWeight: '800',
                          color: overallScore >= 70 ? '#22c55e' : overallScore >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      >
                        {overallScore.toFixed(0)}%
                      </div>
                      <div style={{ color: 'var(--text-muted)' }} className="text-[10px] text-center font-mono py-1">
                        Tech: {technicalScore.toFixed(0)}% · Psych: {psychScore.toFixed(0)}% · Risk:{' '}
                        {followedRiskRulesPct}%
                      </div>
                    </div>
                  </div>
                </section>

                {/* CARD 8: PSYCHOLOGY INDEX */}
                <section style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', padding: '16px 20px' }} className="relative overflow-hidden">
                  <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: '600', textTransform: 'none' }} className="font-display tracking-tight">
                    Psychology Index
                  </h2>
                  <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-1 mb-4">
                    Rate your mental state for this specific trade.
                  </p>

                  <div className="space-y-4">
                    {/* External Stress Factors */}
                    <PsychSlider
                      label="External Factors"
                      value={externalStress}
                      onChange={setExternalStress}
                      hint="Life stress level — 0=very stressed, 100=fully calm"
                      valueColorClass="text-[var(--accent)] font-bold animate-pulse"
                      accentColor="var(--accent)"
                    />

                    {/* Price Reading */}
                    <PsychSlider
                      label="Price Action Reading"
                      value={priceActionReading}
                      onChange={setPriceActionReading}
                      hint="How well were you reading the market?"
                      valueColorClass="text-[var(--accent)] font-bold animate-pulse"
                      accentColor="var(--accent)"
                    />

                    {/* Confidence */}
                    <PsychSlider
                      label="Confidence"
                      value={confidence}
                      onChange={setConfidence}
                      hint="Overall confidence entering this trade"
                      valueColorClass="text-[var(--accent)] font-bold animate-pulse"
                      accentColor="var(--accent)"
                    />

                    {/* Entry levels Precision */}
                    <PsychSlider
                      label="Entry Level Confidence"
                      value={entryLevels}
                      onChange={setEntryLevels}
                      hint="How precise was your entry point?"
                      valueColorClass="text-[var(--accent)] font-bold animate-pulse"
                      accentColor="var(--accent)"
                    />

                    {/* Anxiety warning state */}
                    <PsychSlider
                      label="Anxiety ⚠"
                      value={anxiety}
                      onChange={setAnxiety}
                      hint="0=calm, 100=very anxious — LOWER is better"
                      valueColorClass="text-[#f59e0b] font-bold animate-pulse"
                      accentColor="#f59e0b"
                    />

                    {/* Fear warning state */}
                    <PsychSlider
                      label="Fear ⚠"
                      value={fear}
                      onChange={setFear}
                      hint="0=fearless, 100=fearful — LOWER is better"
                      valueColorClass="text-[#ef4444] font-bold animate-pulse"
                      accentColor="#ef4444"
                    />

                    {/* Composite psychological outcome result display */}
                    <div style={{ borderColor: 'var(--border)' }} className="border-t pt-4 mt-2">
                       <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                        Psychological Condition
                      </div>
                      <div
                        className="text-3xl font-black mt-1 font-display"
                        style={{
                          color: psychScore >= 70 ? '#22c55e' : psychScore >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      >
                        {psychScore.toFixed(1)}%
                      </div>
                      <p style={{ color: 'var(--text-muted)' }} className="text-[10px] italic mt-1 font-mono">
                        * Anxiety & Fear are inverted in calculated score
                      </p>
                    </div>
                  </div>
                </section>

                {/* CARD 9: RISK MANAGEMENT */}
                <section style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', padding: '16px 20px' }} className="relative overflow-hidden">
                  <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: '600', textTransform: 'none' }} className="font-display tracking-tight mb-4">
                    Risk Management
                  </h2>

                  <div className="space-y-4">
                    {/* Decided planned risk */}
                    <div>
                      <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                        Planned Risk Before Entry (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={decidedRisk}
                        onChange={(e) => setDecidedRisk(e.target.value)}
                        placeholder={risk || 'Amount you planned to risk'}
                        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                        className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)]"
                      />
                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] italic mt-1.5 block">
                        May differ from actual Risk field inside Card 2
                      </span>
                    </div>

                    {/* Rating slider */}
                    <div>
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Followed Risk Rules
                        </span>
                        <span
                          className="font-black tracking-wider"
                          style={{
                            color: followedRiskRulesPct >= 70 ? '#22c55e' : followedRiskRulesPct >= 50 ? '#f59e0b' : '#ef4444'
                          }}
                        >
                          {followedRiskRulesPct}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={followedRiskRulesPct}
                        onChange={(e) => setFollowedRiskRulesPct(parseInt(e.target.value, 10))}
                        style={{ backgroundColor: 'var(--bar)', accentColor: 'var(--accent)' }}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      />
                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] italic mt-2.5 block text-center font-mono">
                        0% = broke rules entirely · 100% = followed perfectly
                      </span>
                    </div>
                  </div>
                </section>

                {/* CARD 10: TRADE MEDIA SECTION */}
                <section style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', padding: '16px 20px' }} className="relative overflow-hidden">
                  <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: '600', textTransform: 'none' }} className="font-display tracking-tight mb-4">
                    Trade Media
                  </h2>

                  <div className="space-y-4">
                    {/* Chart Screenshot area */}
                    <div>
                      <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                        Chart Screenshot
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        ref={chartInputRef}
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleChartFileChange(e.target.files[0]);
                        }}
                        className="hidden"
                      />

                      {existingChartImageUrl && !chartRemoved ? (
                        <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)' }} className="relative aspect-video rounded-xl overflow-hidden group">
                          <img
                            src={existingChartImageUrl}
                            alt="Original archived trade chart"
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setChartRemoved(true);
                            }}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md cursor-pointer transition-all"
                            title="Remove archived screenshot"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : chartImagePreview ? (
                        <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)' }} className="relative aspect-video rounded-xl overflow-hidden group">
                          <img
                            src={chartImagePreview}
                            alt="Screenshot preview"
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setChartImageFile(null);
                              setChartImagePreview(null);
                            }}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragEnter={handleDragChart}
                          onDragLeave={handleDragChart}
                          onDragOver={handleDragChart}
                          onDrop={handleDropChart}
                          onClick={() => chartInputRef.current?.click()}
                          style={{ borderColor: 'var(--border)' }}
                          className={`border-[0.5px] border-dashed rounded-lg p-5 text-center transition-all cursor-pointer ${
                            dragActiveChart
                              ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                              : 'hover:border-[var(--accent)] hover:bg-[var(--bar)]'
                          }`}
                        >
                          <ImagePlus className="w-8 h-8 text-zinc-400 mx-auto mb-2 animate-pulse" />
                          <p style={{ color: 'var(--text)' }} className="text-xs font-bold font-display">
                            Drop chart screenshot here
                          </p>
                          <p style={{ color: 'var(--accent)' }} className="text-[11px] font-semibold underline mt-1">
                            or click to browse
                          </p>
                          <p style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono mt-1.5">
                            JPG · PNG · WEBP · Max 10MB
                          </p>
                        </div>
                      )}

                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] italic mt-2.5 block font-mono">
                        📌 Will be processed by AI Vision Engine in Phase 8
                      </span>
                    </div>

                    {/* Trade Video URl */}
                    <div>
                      <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                        Trade Recording URL (optional)
                      </label>
                      <input
                        type="url"
                        value={tradeVideoUrl}
                        onChange={(e) => setTradeVideoUrl(e.target.value)}
                        placeholder="YouTube, Loom, or other recording link"
                        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', padding: '8px 12px' }}
                        className="focus:border-[var(--accent)] w-full focus:outline-none placeholder:text-[var(--text-muted)] font-mono"
                      />
                    </div>

                    {/* Trade Plan PDF/Image */}
                    <div>
                      <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-2">
                        Trade Plan (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        ref={planInputRef}
                        onChange={(e) => {
                          if (e.target.files?.[0]) handlePlanFileChange(e.target.files[0]);
                        }}
                        className="hidden"
                      />

                      {existingPlanUrl && !planRemoved ? (
                        <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)' }} className="p-3 rounded-lg flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <CheckSquare className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <span style={{ color: 'var(--text)' }} className="truncate font-mono font-medium" title={existingPlanUrl.split('/').pop()}>
                              {existingPlanUrl.split('/').pop() || 'Original Archived Plan'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPlanRemoved(true);
                            }}
                            className="text-zinc-400 hover:text-red-500 p-1 cursor-pointer"
                            title="Remove archived plan"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : tradePlanFile ? (
                        <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)' }} className="p-3 rounded-lg flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <CheckSquare className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <span style={{ color: 'var(--text)' }} className="truncate font-mono font-medium" title={tradePlanFile.name}>
                              {tradePlanFile.name}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }} className="text-[10px] shrink-0">
                              ({(tradePlanFile.size / 1024 / 1024).toFixed(2)}MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTradePlanFile(null);
                              setTradePlanPreview(null);
                            }}
                            className="text-zinc-400 hover:text-red-500 p-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragEnter={handleDragPlan}
                          onDragLeave={handleDragPlan}
                          onDragOver={handleDragPlan}
                          onDrop={handleDropPlan}
                          onClick={() => planInputRef.current?.click()}
                          style={{ borderColor: 'var(--border)' }}
                          className={`border-[0.5px] border-dashed rounded-lg p-3 text-center transition-all cursor-pointer ${
                            dragActivePlan
                              ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                              : 'hover:border-[var(--accent)] hover:bg-[var(--bar)]'
                          }`}
                        >
                          <p style={{ color: 'var(--text-muted)' }} className="text-[11px] font-semibold">
                            Upload trade plan screenshot or PDF
                          </p>
                          <p style={{ color: 'var(--accent)' }} className="text-[10px] font-bold underline mt-0.5">
                            click to select
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};
