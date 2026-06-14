import React, { useState, useEffect, useRef } from 'react';
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
import { Menu, Save, ImagePlus, Target, X, CheckSquare } from 'lucide-react';
import { Strategy, StagedRuleState } from '../types';

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
  const [callPut, setCallPut] = useState<'CALL' | 'PUT' | 'LONG' | 'SHORT' | null>(null);
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

  // Card 8: Psychology Sliders
  const [externalStress, setExternalStress] = useState<number>(70);
  const [priceActionReading, setPriceActionReading] = useState<number>(70);
  const [confidence, setConfidence] = useState<number>(70);
  const [entryLevels, setEntryLevels] = useState<number>(70);
  const [anxiety, setAnxiety] = useState<number>(10);
  const [fear, setFear] = useState<number>(10);

  // Card 9: Risk Management
  const [decidedRisk, setDecidedRisk] = useState<string>('');
  const [followedRiskRulesPct, setFollowedRiskRulesPct] = useState<number>(100);

  // Card 10: Trade Media Files
  const [chartImageFile, setChartImageFile] = useState<File | null>(null);
  const [chartImagePreview, setChartImagePreview] = useState<string | null>(null);
  const [tradeVideoUrl, setTradeVideoUrl] = useState<string>('');
  const [tradePlanFile, setTradePlanFile] = useState<File | null>(null);
  const [tradePlanPreview, setTradePlanPreview] = useState<string | null>(null);

  // Drag and Drop State
  const [dragActiveChart, setDragActiveChart] = useState(false);
  const [dragActivePlan, setDragActivePlan] = useState(false);

  // File Inputs references
  const chartInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);

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
      try {
        setLoading(true);
        const [tradeRes, rulesRes, psychRes, riskRes] = await Promise.all([
          supabase
            .from('trades')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single(),
          supabase
            .from('trade_rule_adherence')
            .select('*')
            .eq('trade_id', id)
            .eq('user_id', userId)
            .order('rule_type')
            .order('rule_order', { ascending: true }),
          supabase
            .from('trade_psychology')
            .select('*')
            .eq('trade_id', id)
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('trade_risk_management')
            .select('*')
            .eq('trade_id', id)
            .eq('user_id', userId)
            .maybeSingle(),
        ]);

        if (tradeRes.error) {
          throw new Error(tradeRes.error.message || 'Original trade details could not be found.');
        }

        const tradeData = tradeRes.data;
        if (tradeData) {
          setDate(tradeData.date || '');
          setEntryTime(tradeData.entry_time || '');
          setSymbol(tradeData.symbol || '');
          setCallPut(tradeData.call_put || null);
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
          setExecutionStatus(tradeData.execution_status || null);
          setMistakeType(tradeData.mistake_type || '');
          setMistakeText(tradeData.mistake_text || '');
          setTradeRating(tradeData.trade_rating || 0);
          setNotes(tradeData.notes || '');
          setTradeVideoUrl(tradeData.trade_video_url || '');

          setExistingChartImageUrl(tradeData.chart_image_url || null);
          setExistingPlanUrl(tradeData.trade_plan_url || null);
        }

        const allRules = rulesRes.data || [];
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

        if (psychRes.data) {
          setExternalStress(psychRes.data.external_stress_pct ?? 70);
          setPriceActionReading(psychRes.data.price_action_reading_pct ?? 70);
          setConfidence(psychRes.data.confidence_pct ?? 70);
          setEntryLevels(psychRes.data.entry_levels_pct ?? 70);
          setAnxiety(psychRes.data.anxiety_pct ?? 10);
          setFear(psychRes.data.fear_pct ?? 10);
        }

        if (riskRes.data) {
          setDecidedRisk(riskRes.data.decided_risk !== null ? riskRes.data.decided_risk.toString() : '');
          setFollowedRiskRulesPct(riskRes.data.followed_risk_rules_pct ?? 100);
        }

      } catch (err: any) {
        console.error('Error fetching trade details for edit:', err);
        showError('Could not load original trade configurations.');
        navigate('/trading-logs');
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

  // Save/Update Trade Submission
  const handleSaveTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date.trim() || !symbol.trim()) {
      showError('Date and Symbol are required * before logging.');
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
            call_put: callPut || null,
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
            month: parsedMonth,
            year: parsedYear,
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
            call_put: callPut || null,
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
          rule_id: r.rule_id || r.id,
          rule_type: 'entry',
          rule_order: r.rule_order,
          rule_text: r.rule_text,
          followed: r.followed === true,
        })),
        ...exitRules.map((r) => ({
          trade_id: targetTradeId,
          user_id: userId,
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

      // 4. Upsert Psychology Row
      const { error: psychError } = await supabase
        .from('trade_psychology')
        .upsert({
          trade_id: targetTradeId,
          user_id: userId,
          external_stress_pct: externalStress,
          price_action_reading_pct: priceActionReading,
          confidence_pct: confidence,
          entry_levels_pct: entryLevels,
          anxiety_pct: anxiety,
          fear_pct: fear,
          psychological_condition_pct: parseFloat(psychScore.toFixed(2)),
        }, { onConflict: 'trade_id' });
      if (psychError) console.error('Psychology insertion failed:', psychError);

      // 5. Upsert Risk Management Row
      const finalPlannedRisk =
        decidedRisk !== ''
          ? parseFloat(decidedRisk)
          : risk !== ''
          ? parseFloat(risk)
          : null;

      const { error: riskError } = await supabase
        .from('trade_risk_management')
        .upsert({
          trade_id: targetTradeId,
          user_id: userId,
          decided_risk: finalPlannedRisk,
          followed_risk_rules_pct: followedRiskRulesPct,
        }, { onConflict: 'trade_id' });
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
      const updates: Record<string, string | null> = {};
      updates.chart_image_url = updatedChartUrl;
      updates.trade_plan_url = updatedPlanUrl;

      await supabase
        .from('trades')
        .update(updates)
        .eq('id', targetTradeId)
        .eq('user_id', userId);

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
    setCallPut(null);
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

    setEntryRules([]);
    setExitRules([]);

    setExecutionStatus(null);
    setMistakeType('');
    setMistakeText('');
    setTradeRating(0);
    setNotes('');

    setExternalStress(70);
    setPriceActionReading(70);
    setConfidence(70);
    setEntryLevels(70);
    setAnxiety(10);
    setFear(10);

    setDecidedRisk('');
    setFollowedRiskRulesPct(100);

    setChartImageFile(null);
    setChartImagePreview(null);
    setTradeVideoUrl('');
    setTradePlanFile(null);
    setTradePlanPreview(null);
  };

  // Render auth or fallback spinner
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

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
          <form onSubmit={handleSaveTradeSubmit} className="max-w-6xl mx-auto">
            {/* PAGE HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {isEditMode && (
                  <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-500 mb-2">
                    <Link to="/trading-logs" className="hover:text-indigo-400 transition-colors">TRADING LOGS</Link>
                    <span>/</span>
                    <Link to={`/trading-logs/${id}`} className="hover:text-indigo-400 transition-colors">TRADE AUDIT</Link>
                    <span>/</span>
                    <span className="text-zinc-300">EDIT</span>
                  </div>
                )}
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 font-display">
                  {isEditMode ? 'Edit Trade' : 'Log Trade'}
                </h1>
                <p className="text-sm text-zinc-400 mt-1.5">
                  {isEditMode 
                    ? 'Modify transaction parameters, rules adherence, scores and media contents.' 
                    : 'Record your complete trade — rules, psychology, execution, and media.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isEditMode && (
                  <Link 
                    to={`/trading-logs/${id}`}
                    className="w-full sm:w-auto border border-zinc-805 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl px-5 py-3 text-sm transition-all cursor-pointer flex items-center justify-center"
                  >
                    Cancel
                  </Link>
                )}
                <button
                  type="submit"
                  disabled={saving || !date.trim() || !symbol.trim()}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-850 disabled:opacity-50 text-white font-semibold rounded-xl px-6 py-3 text-sm transition-all shadow-lg shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2"
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
            </div>

            <div className="border-b border-zinc-800/80 mt-5 mb-8" />

            {/* THREE-COLUMN LAYOUT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT COLUMN (COL SPAN 2): Form Fields Cards 1-6 */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* CARD 1: TRADE DETAILS */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <h2 className="text-lg font-bold text-zinc-100 border-b border-zinc-800/80 pb-3 font-display">
                    Trade Details
                  </h2>

                  <div className="space-y-4 mt-4">
                    {/* Date and Entry Time row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Date <span className="text-indigo-400">*</span>
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Entry Time
                        </label>
                        <input
                          type="time"
                          value={entryTime}
                          onChange={(e) => setEntryTime(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm font-mono"
                        />
                      </div>
                    </div>

                    {/* Symbol and Direction pill row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Symbol <span className="text-indigo-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={symbol}
                          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                          placeholder="e.g. XAUUSD, BANKNIFTY"
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Direction
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(['CALL', 'PUT', 'LONG', 'SHORT'] as const).map((dir) => {
                            const isSel = callPut === dir;
                            let selStyle = '';
                            if (dir === 'CALL') selStyle = 'bg-green-900/80 border-green-600 text-green-300';
                            if (dir === 'PUT') selStyle = 'bg-red-900/80 border-red-600 text-red-300';
                            if (dir === 'LONG') selStyle = 'bg-blue-900/80 border-blue-600 text-blue-300';
                            if (dir === 'SHORT') selStyle = 'bg-purple-900/80 border-purple-600 text-purple-300';

                            return (
                              <button
                                key={dir}
                                type="button"
                                onClick={() => setCallPut(callPut === dir ? null : dir)}
                                className={`rounded-xl py-2.5 text-xs font-bold text-center cursor-pointer transition-all border ${
                                  isSel
                                    ? selStyle
                                    : 'bg-transparent border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                }`}
                              >
                                {dir}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Strategy Setup Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                        Strategy / Setup
                      </label>
                      <select
                        value={strategyId}
                        onChange={handleStrategyChange}
                        className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none text-sm cursor-pointer appearance-none"
                      >
                        <option value="">— No Setup / Select Strategy —</option>
                        {strategies.map((st) => (
                          <option key={st.id} value={st.id}>
                            #{st.sr_no} {st.name} ({st.type_of_strategy})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Opening conditions row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Opening Condition
                        </label>
                        <select
                          value={openingCondition}
                          onChange={(e) => setOpeningCondition(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-3 py-3 w-full focus:border-indigo-500 focus:outline-none text-sm cursor-pointer"
                        >
                          <option value="">— Select —</option>
                          <option value="London Open">London Open</option>
                          <option value="NY Open">NY Open</option>
                          <option value="Asian Session">Asian Session</option>
                          <option value="Killzone">Killzone</option>
                          <option value="Pre-Market">Pre-Market</option>
                          <option value="Mid-Day">Mid-Day</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Hourly Trend
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['UP', 'DOWN', 'CONSOLIDATION'] as const).map((trend) => {
                            const isSel = hourlyTrend === trend;
                            let selStyle = 'bg-zinc-850 border-zinc-650 text-zinc-200';
                            if (trend === 'UP') selStyle = 'bg-green-950 border-green-700 text-green-300';
                            if (trend === 'DOWN') selStyle = 'bg-red-950 border-red-700 text-red-300';

                            return (
                              <button
                                key={trend}
                                type="button"
                                onClick={() => setHourlyTrend(hourlyTrend === trend ? null : trend)}
                                className={`rounded-xl py-2.5 text-[10px] sm:text-xs font-bold text-center cursor-pointer border transition-all truncate ${
                                  isSel
                                    ? selStyle
                                    : 'bg-transparent border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                }`}
                              >
                                {trend === 'CONSOLIDATION' ? 'BE/RNG' : trend}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Phase (PO3)
                        </label>
                        <select
                          value={phase}
                          onChange={(e) => setPhase(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-3 py-3 w-full focus:border-indigo-500 focus:outline-none text-sm cursor-pointer"
                        >
                          <option value="">— Select —</option>
                          <option value="Accumulation">Accumulation</option>
                          <option value="Manipulation">Manipulation</option>
                          <option value="Distribution">Distribution</option>
                        </select>
                      </div>
                    </div>

                    {/* Trend Position and Holding times */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Trend Position
                        </label>
                        <select
                          value={trendPosition}
                          onChange={(e) => setTrendPosition(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none text-sm cursor-pointer"
                        >
                          <option value="">— Select —</option>
                          <option value="Trend Starting">Trend Starting</option>
                          <option value="Trend Middle">Trend Middle</option>
                          <option value="Trend Ending">Trend Ending</option>
                          <option value="Ranging">Ranging</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Holding Time (mins)
                        </label>
                        <input
                          type="number"
                          id="holdingTimeMins"
                          min="0"
                          value={holdingTimeMins}
                          onChange={(e) => setHoldingTimeMins(e.target.value)}
                          placeholder="e.g. 45"
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* CARD 2: FINANCIAL DATA */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <h2 className="text-lg font-bold text-zinc-100 font-display">
                      Financial Data
                    </h2>
                    <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                      (₹ Indian Rupees)
                    </span>
                  </div>

                  <div className="space-y-4 mt-4">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Investment (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={investment}
                          onChange={(e) => setInvestment(e.target.value)}
                          placeholder="deployed capital"
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Risk (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={risk}
                          onChange={(e) => setRisk(e.target.value)}
                          placeholder="max risk amount"
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Net P&L (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={pnl}
                          onChange={(e) => setPnl(e.target.value)}
                          placeholder="negative for loss"
                          className={`bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm ${
                            pnl === ''
                              ? 'text-zinc-100'
                              : parseFloat(pnl) > 0
                              ? 'text-green-400'
                              : parseFloat(pnl) < 0
                              ? 'text-red-400'
                              : 'text-zinc-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Max Drawdown (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={maxDrawdown}
                          onChange={(e) => setMaxDrawdown(e.target.value)}
                          placeholder="worst adverse amount"
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Qty / Lots
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="0.00"
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Points / Pips
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={points}
                          onChange={(e) => setPoints(e.target.value)}
                          placeholder="0.00"
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm"
                        />
                      </div>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Brokerage / Fees (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={fees}
                          onChange={(e) => setFees(e.target.value)}
                          placeholder="0.00"
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm"
                        />
                      </div>
                      <div className="hidden sm:block" />
                      <div className="hidden sm:block" />
                    </div>
                  </div>
                </section>

                {/* CARD 3: AUTO-CALCULATED RESULTS */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <h2 className="text-lg font-bold text-zinc-100 font-display">
                      Auto-Calculated
                    </h2>
                    <span className="text-xs text-zinc-500 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Updates as you type
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                    {/* Trade Status Badge Cell */}
                    <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/40 rounded-2xl border border-zinc-850 text-center min-h-[90px]">
                      {calculatedStatus === 'Win' && (
                        <span className="bg-green-950 border border-green-700/80 text-green-300 text-sm font-extrabold px-5 py-2.5 rounded-xl uppercase tracking-wider w-full max-w-[140px]">
                          ✓ WIN
                        </span>
                      )}
                      {calculatedStatus === 'Loss' && (
                        <span className="bg-red-950 border border-red-700/80 text-red-300 text-sm font-extrabold px-5 py-2.5 rounded-xl uppercase tracking-wider w-full max-w-[140px]">
                          ✗ LOSS
                        </span>
                      )}
                      {calculatedStatus === 'Breakeven' && (
                        <span className="bg-zinc-800 border border-zinc-650 text-zinc-300 text-sm font-extrabold px-5 py-2.5 rounded-xl uppercase tracking-wider w-full max-w-[140px]">
                          — BE
                        </span>
                      )}
                      {calculatedStatus === null && (
                        <span className="border border-zinc-800 text-zinc-600 text-sm font-bold px-5 py-2.5 rounded-xl uppercase tracking-wider w-full max-w-[140px] opacity-60">
                          Status
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mt-2.5">
                        Status
                      </span>
                    </div>

                    {/* R Multiple */}
                    <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/40 rounded-2xl border border-zinc-850 text-center min-h-[90px]">
                      <span
                        className={`text-2xl font-black font-display ${
                          calculatedRMultiple === null
                            ? 'text-zinc-600'
                            : calculatedRMultiple > 0
                            ? 'text-green-400'
                            : calculatedRMultiple < 0
                            ? 'text-red-400'
                            : 'text-zinc-300'
                        }`}
                      >
                        {calculatedRMultiple !== null
                          ? `${calculatedRMultiple.toFixed(2)}R`
                          : '—'}
                      </span>
                      <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mt-2.5">
                        R-Multiple
                      </span>
                    </div>

                    {/* ROI% */}
                    <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/40 rounded-2xl border border-zinc-850 text-center min-h-[90px]">
                      <span
                        className={`text-2xl font-black font-display ${
                          calculatedRoi === null
                            ? 'text-zinc-600'
                            : calculatedRoi > 0
                            ? 'text-green-400'
                            : calculatedRoi < 0
                            ? 'text-red-400'
                            : 'text-zinc-300'
                        }`}
                      >
                        {calculatedRoi !== null ? `${calculatedRoi.toFixed(2)}%` : '—'}
                      </span>
                      <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mt-2.5">
                        ROI %
                      </span>
                    </div>

                    {/* ROR% */}
                    <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/40 rounded-2xl border border-zinc-850 text-center min-h-[90px]">
                      <span
                        className={`text-2xl font-black font-display ${
                          calculatedRor === null ? 'text-zinc-600' : 'text-amber-400'
                        }`}
                      >
                        {calculatedRor !== null ? `${calculatedRor.toFixed(2)}%` : '—'}
                      </span>
                      <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mt-2.5">
                        Risk %
                      </span>
                    </div>

                    {/* MDD% */}
                    <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/40 rounded-2xl border border-zinc-850 text-center min-h-[90px]">
                      <span
                        className={`text-2xl font-black font-display ${
                          calculatedMddPct === null ? 'text-zinc-600' : 'text-amber-400'
                        }`}
                      >
                        {calculatedMddPct !== null ? `${calculatedMddPct.toFixed(2)}%` : '—'}
                      </span>
                      <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mt-2.5">
                        Max DD %
                      </span>
                    </div>

                    {/* Month Year display Period */}
                    <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/40 rounded-2xl border border-zinc-850 text-center min-h-[90px]">
                      <span className="text-2xl font-black font-display text-zinc-200">
                        {calculatedPeriod}
                      </span>
                      <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mt-2.5">
                        Period
                      </span>
                    </div>
                  </div>
                </section>

                {/* CARD 4: ENTRY RULES CHECKLIST */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-start border-b border-zinc-800/80 pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-zinc-100 font-display">
                        Entry Rules
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        Did you follow your entry rules for this trade?
                      </p>
                    </div>

                    {strategyId && (
                      <span
                        className={`border rounded-full px-3.5 py-1 text-xs font-bold tracking-wider font-mono uppercase ${
                          technicalScore >= 70
                            ? 'bg-green-950/60 text-green-400 border-green-800/80'
                            : technicalScore >= 50
                            ? 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                            : 'bg-red-950/60 text-red-400 border-red-850'
                        }`}
                      >
                        Technical: {technicalScore.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {isEditMode && (
                    <div className="bg-indigo-950/50 border border-indigo-500/20 text-indigo-300 text-xs rounded-xl p-3 mt-4 mb-2 flex items-start gap-2.5">
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
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="border-b border-zinc-800/80 pb-3">
                    <h2 className="text-lg font-bold text-zinc-100 font-display">
                      Exit Rules
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
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
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <h2 className="text-lg font-bold text-zinc-100 border-b border-zinc-800/80 pb-3 font-display">
                    Execution Quality
                  </h2>

                  <div className="space-y-5 mt-4">
                    {/* Execution Picker component */}
                    <ExecutionPicker value={executionStatus} onChange={setExecutionStatus} />

                    {/* Type and actual mistake cascading cascade */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Type of Mistake
                        </label>
                        <select
                          value={mistakeType}
                          onChange={(e) => setMistakeType(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none text-sm cursor-pointer"
                        >
                          <option value="">— Select —</option>
                          <option value="Technical">Technical</option>
                          <option value="Psychological">Psychological</option>
                          <option value="Risk Management">Risk Management</option>
                          <option value="No Mistake">No Mistake</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                          Actual Mistake
                        </label>
                        {mistakeType === 'No Mistake' ? (
                          <input
                            type="text"
                            value="Clean trade execution"
                            disabled
                            className="bg-zinc-955 border border-zinc-800/80 text-zinc-500 rounded-xl px-4 py-3 w-full text-sm font-medium"
                          />
                        ) : (
                          <select
                            value={mistakeText}
                            onChange={(e) => setMistakeText(e.target.value)}
                            disabled={!mistakeType}
                            className={`bg-zinc-955 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none text-sm ${
                              !mistakeType ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            {!mistakeType ? (
                              <option value="">— Select type first —</option>
                            ) : (
                              <>
                                <option value="">— Select —</option>
                                {mistakeType === 'Technical' && (
                                  <>
                                    <option value="Early Exit">Early Exit</option>
                                    <option value="Exit without reason">Exit without reason</option>
                                    <option value="Ignoring price action">Ignoring price action</option>
                                    <option value="OB Ignoring & very tight SL">OB Ignoring & very tight SL</option>
                                    <option value="Taking trade against the bias">Taking trade against the bias</option>
                                    <option value="Without setup entry">Without setup entry</option>
                                    <option value="Wrong entry point">Wrong entry point</option>
                                    <option value="Wrong SL calculation">Wrong SL calculation</option>
                                  </>
                                )}
                                {mistakeType === 'Psychological' && (
                                  <>
                                    <option value="Without setup entry (emotional override)">
                                      Without setup entry (emotional override)
                                    </option>
                                    <option value="Exit without reason (fear-based)">
                                      Exit without reason (fear-based)
                                    </option>
                                    <option value="Taking trade against the bias (FOMO)">
                                      Taking trade against the bias (FOMO)
                                    </option>
                                    <option value="Revenge trade after loss">Revenge trade after loss</option>
                                  </>
                                )}
                                {mistakeType === 'Risk Management' && (
                                  <>
                                    <option value="Small quantity (undersized)">Small quantity (undersized)</option>
                                    <option value="Very close SL">Very close SL</option>
                                    <option value="Wrong SL calculation">Wrong SL calculation</option>
                                    <option value="Oversized position">Oversized position</option>
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
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                        Notes / Observations
                      </label>
                      <textarea
                        rows={5}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What happened on this trade? What did you observe? What would you do differently? Key lesson..."
                        className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none text-sm placeholder-zinc-700 resize-y"
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN (COL SPAN 1): sticky widgets Cards 7-10 */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* CARD 7: LIVE TRADE SCORE CONTAINER */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl sticky top-4 z-10 transition-all">
                  <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
                    <h2 className="text-lg font-bold text-zinc-100 font-display">
                      Trade Score
                    </h2>
                    <span className="bg-green-950 text-green-400 border border-green-800 text-[10px] font-mono tracking-widest uppercase font-bold rounded-full px-2.5 py-0.5 animate-pulse">
                      LIVE
                    </span>
                  </div>

                  <div className="space-y-4 mt-5">
                    {/* Scores Progress elements */}
                    <ScoreBar
                      label="Technical"
                      value={technicalScore}
                      subLabel="Entry + Exit rules followed"
                      fillColorClass="bg-indigo-600"
                    />

                    <ScoreBar
                      label="Psychology"
                      value={psychScore}
                      subLabel="Mental state composite"
                      fillColorClass="bg-purple-600"
                    />

                    <ScoreBar
                      label="Risk Management"
                      value={followedRiskRulesPct}
                      subLabel="Risk rules adherence"
                      fillColorClass="bg-teal-500"
                    />

                    <div className="border-t border-zinc-800/80 my-4 pt-4" />

                    {/* Overall composite score display */}
                    <div className="text-center font-sans space-y-1">
                      <div className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
                        Overall Score
                      </div>
                      <div
                        className={`text-5xl font-black ${
                          overallScore >= 70
                            ? 'text-green-400'
                            : overallScore >= 50
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {overallScore.toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-zinc-500 text-center font-mono py-1">
                        Tech: {technicalScore.toFixed(0)}% · Psych: {psychScore.toFixed(0)}% · Risk:{' '}
                        {followedRiskRulesPct}%
                      </div>
                    </div>
                  </div>
                </section>

                {/* CARD 8: PSYCHOLOGY INDEX */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <h2 className="text-lg font-bold text-zinc-100 font-display">
                    Psychology Index
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 pb-1 border-b border-zinc-800/85">
                    Rate your mental state for this specific trade.
                  </p>

                  <div className="space-y-4 mt-4">
                    {/* External Stress Factors */}
                    <PsychSlider
                      label="External Factors"
                      value={externalStress}
                      onChange={setExternalStress}
                      hint="Life stress level — 0=very stressed, 100=fully calm"
                      valueColorClass="text-indigo-400"
                      accentClass="accent-indigo-500"
                    />

                    {/* Price Reading */}
                    <PsychSlider
                      label="Price Action Reading"
                      value={priceActionReading}
                      onChange={setPriceActionReading}
                      hint="How well were you reading the market?"
                      valueColorClass="text-indigo-400"
                      accentClass="accent-indigo-500"
                    />

                    {/* Confidence */}
                    <PsychSlider
                      label="Confidence"
                      value={confidence}
                      onChange={setConfidence}
                      hint="Overall confidence entering this trade"
                      valueColorClass="text-indigo-400"
                      accentClass="accent-indigo-500"
                    />

                    {/* Entry levels Precision */}
                    <PsychSlider
                      label="Entry Level Confidence"
                      value={entryLevels}
                      onChange={setEntryLevels}
                      hint="How precise was your entry point?"
                      valueColorClass="text-indigo-400"
                      accentClass="accent-indigo-500"
                    />

                    {/* Anxiety warning state */}
                    <PsychSlider
                      label="Anxiety ⚠"
                      value={anxiety}
                      onChange={setAnxiety}
                      hint="0=calm, 100=very anxious — LOWER is better"
                      valueColorClass="text-amber-400"
                      accentClass="accent-amber-500"
                    />

                    {/* Fear warning state */}
                    <PsychSlider
                      label="Fear ⚠"
                      value={fear}
                      onChange={setFear}
                      hint="0=fearless, 100=fearful — LOWER is better"
                      valueColorClass="text-red-400"
                      accentClass="accent-red-500"
                    />

                    {/* Composite psychological outcome result display */}
                    <div className="border-t border-zinc-850 pt-4 mt-2">
                      <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        Psychological Condition
                      </div>
                      <div
                        className={`text-3xl font-black mt-1 font-display ${
                          psychScore >= 70
                            ? 'text-green-400'
                            : psychScore >= 50
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {psychScore.toFixed(1)}%
                      </div>
                      <p className="text-[10px] text-zinc-500 italic mt-1 font-mono">
                        * Anxiety & Fear are inverted in calculated score
                      </p>
                    </div>
                  </div>
                </section>

                {/* CARD 9: RISK MANAGEMENT */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <h2 className="text-lg font-bold text-zinc-100 border-b border-zinc-800/80 pb-3 font-display">
                    Risk Management
                  </h2>

                  <div className="space-y-4 mt-4">
                    {/* Decided planned risk */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                        Planned Risk Before Entry (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={decidedRisk}
                        onChange={(e) => setDecidedRisk(e.target.value)}
                        placeholder={risk || 'Amount you planned to risk'}
                        className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm"
                      />
                      <span className="text-[10px] text-zinc-500 italic mt-1.5 block">
                        May differ from actual Risk field inside Card 2
                      </span>
                    </div>

                    {/* Rating slider */}
                    <div>
                      <div className="flex justify-between items-center text-sm. mb-2">
                        <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                          Followed Risk Rules
                        </span>
                        <span
                          className={`font-black tracking-wider ${
                            followedRiskRulesPct >= 70
                              ? 'text-green-400'
                              : followedRiskRulesPct >= 50
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
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
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <span className="text-[10px] text-zinc-500 italic mt-2.5 block text-center font-mono">
                        0% = broke rules entirely · 100% = followed perfectly
                      </span>
                    </div>
                  </div>
                </section>

                {/* CARD 10: TRADE MEDIA SECTION */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <h2 className="text-lg font-bold text-zinc-100 border-b border-zinc-800/80 pb-3 font-display">
                    Trade Media
                  </h2>

                  <div className="space-y-4 mt-4">
                    {/* Chart Screenshot area */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
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
                        <div className="relative aspect-video rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden group">
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
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg shadow-black/60 cursor-pointer transition-all"
                            title="Remove archived screenshot"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : chartImagePreview ? (
                        <div className="relative aspect-video rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden group">
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
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg shadow-black/55 cursor-pointer"
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
                          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                            dragActiveChart
                              ? 'border-indigo-500 bg-indigo-950/20'
                              : 'border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-950/20'
                          }`}
                        >
                          <ImagePlus className="w-8 h-8 text-zinc-650 mx-auto mb-2 animate-pulse" />
                          <p className="text-zinc-300 text-xs font-bold font-display">
                            Drop chart screenshot here
                          </p>
                          <p className="text-indigo-400 text-[11px] font-semibold underline mt-1">
                            or click to browse
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-1.5">
                            JPG · PNG · WEBP · Max 10MB
                          </p>
                        </div>
                      )}

                      <span className="text-[10px] text-zinc-500 italic mt-2.5 block font-mono">
                        📌 Will be processed by AI Vision Engine in Phase 8
                      </span>
                    </div>

                    {/* Trade Video URl */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                        Trade Recording URL (optional)
                      </label>
                      <input
                        type="url"
                        value={tradeVideoUrl}
                        onChange={(e) => setTradeVideoUrl(e.target.value)}
                        placeholder="YouTube, Loom, or other recording link"
                        className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none placeholder-zinc-700 text-sm font-mono"
                      />
                    </div>

                    {/* Trade Plan PDF/Image */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
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
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <CheckSquare className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <span className="text-zinc-300 truncate font-mono font-medium" title={existingPlanUrl.split('/').pop()}>
                              {existingPlanUrl.split('/').pop() || 'Original Archived Plan'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPlanRemoved(true);
                            }}
                            className="text-zinc-550 hover:text-red-400 p-1 cursor-pointer"
                            title="Remove archived plan"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : tradePlanFile ? (
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <CheckSquare className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <span className="text-zinc-300 truncate font-mono font-medium" title={tradePlanFile.name}>
                              {tradePlanFile.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 shrink-0">
                              ({(tradePlanFile.size / 1024 / 1024).toFixed(2)}MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTradePlanFile(null);
                              setTradePlanPreview(null);
                            }}
                            className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
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
                          className={`border-2 border-dashed rounded-xl p-3.5 text-center transition-all cursor-pointer ${
                            dragActivePlan
                              ? 'border-indigo-500 bg-indigo-950/20'
                              : 'border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-950/20'
                          }`}
                        >
                          <p className="text-zinc-400 text-[11px] font-semibold">
                            Upload trade plan screenshot or PDF
                          </p>
                          <p className="text-indigo-400 text-[10px] font-bold underline mt-0.5">
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
