import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import {
  Menu,
  Send,
  Trash2,
  Brain,
  Compass,
  HelpCircle,
  Activity,
  Sparkles,
  RefreshCw,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';
import {
  calcTradeStats,
  calcScoreAverages,
  formatINR,
  scoreColor
} from '../lib/calculations';
import { buildContextString, buildSystemPrompt } from '../lib/aiContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Inline Markdown Parser
function parseInline(text: string) {
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);
  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-extrabold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="font-mono bg-zinc-800 border border-zinc-700 text-indigo-300 rounded px-1 py-0.5 text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Custom lightweight Markdown Renderer with ZERO external dependencies
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm text-zinc-300 leading-relaxed font-sans">
      {parts.map((part, partIdx) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);

          return (
            <div key={partIdx} className="my-3 rounded-xl border border-zinc-800 bg-[#0F1117] overflow-hidden font-mono text-xs shadow-inner">
              {lang && (
                <div className="bg-zinc-900/80 px-4 py-1.5 border-b border-zinc-800 text-[10px] text-zinc-400 font-sans font-bold uppercase tracking-wider flex justify-between items-center">
                  <span>{lang}</span>
                </div>
              )}
              <pre className="p-4 overflow-x-auto text-indigo-200 select-all leading-relaxed whitespace-pre-wrap">
                {code.trim()}
              </pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={partIdx} className="space-y-1.5">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();

              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lineIdx} className="text-zinc-100 font-bold font-display text-sm mt-3 mb-1.5 flex items-center gap-1.5 text-indigo-400">
                    {parseInline(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lineIdx} className="text-zinc-50 font-extrabold font-display text-base mt-4 mb-2 text-indigo-300 border-b border-zinc-800/40 pb-1">
                    {parseInline(trimmed.slice(3))}
                  </h3>
                );
              }
              if (trimmed.startsWith('# ')) {
                return (
                  <h2 key={lineIdx} className="text-zinc-50 font-black font-display text-lg mt-5 mb-3 text-indigo-150 pb-1">
                    {parseInline(trimmed.slice(2))}
                  </h2>
                );
              }

              if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                return (
                  <ul key={lineIdx} className="list-disc pl-5 space-y-1 my-1">
                    <li className="text-zinc-300 leading-relaxed list-outside">
                      {parseInline(trimmed.slice(2))}
                    </li>
                  </ul>
                );
              }

              if (trimmed === '') {
                return <div key={lineIdx} className="h-1.5" />;
              }

              return (
                <p key={lineIdx} className="text-zinc-350 leading-relaxed font-sans">
                  {parseInline(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export const AiTeacherPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  // Selected Specific Trade Focus
  const [selectedTradeId, setSelectedTradeId] = useState<string>('');

  // UI state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [askingAI, setAskingAI] = useState(false);
  const [question, setQuestion] = useState('');

  // Database States
  const [trades, setTrades] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [psychAll, setPsychAll] = useState<any[]>([]);
  const [riskAll, setRiskAll] = useState<any[]>([]);
  const [rulesAll, setRulesAll] = useState<any[]>([]);

  // Specific selected trade details helper states
  const [specificTrade, setSpecificTrade] = useState<any | null>(null);
  const [specificTradeRules, setSpecificTradeRules] = useState<any[] | null>(null);
  const [specificTradePsych, setSpecificTradePsych] = useState<any | null>(null);
  const [specificTradeRisk, setSpecificTradeRisk] = useState<any | null>(null);

  // Chat conversation
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('tradelyze_ai_teacher_chat');
    return saved ? JSON.parse(saved) : [
      {
        role: 'assistant',
        content: `Greetings, trader. I am your TRADELYZE AI teacher and performance mentor. I have scanned your journal records, setup rules, error logs, and emotional indices.\n\nAsk me anything about your current month stats, setup adherence, psychological pitfalls, or select a specific trade below to dissect its technical or risk execution details.`
      }
    ];
  });

  // Token tracking & cost calculations
  const [totalTokens, setTotalTokens] = useState<number>(() => {
    const saved = localStorage.getItem('tradelyze_ai_total_tokens');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Cost in Rupees calculated from Claude pricing ($15 per 1M tokens USD rate converted to INR)
  const sessionCostINR = useMemo(() => {
    return (totalTokens / 1_000_000) * 15 * 85;
  }, [totalTokens]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chats
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, askingAI]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('tradelyze_ai_teacher_chat', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('tradelyze_ai_total_tokens', totalTokens.toString());
  }, [totalTokens]);

  // Auth Redirection
  useEffect(() => {
    if (!authLoading && !userId) {
      navigate('/login');
    }
  }, [userId, authLoading, navigate]);

  // Load General Performance Contexts
  useEffect(() => {
    if (!userId) return;

    const loadPerformanceContext = async () => {
      try {
        setLoading(true);

        // Fetch all trades of this user
        const { data: allTradesData, error: tradesErr } = await supabase
          .from('trades')
          .select('*, strategies(name, type_of_strategy)')
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (tradesErr) throw tradesErr;
        const tData = allTradesData || [];
        setTrades(tData);

        // Fetch strategies
        const { data: strategiesData, error: stratErr } = await supabase
          .from('strategies')
          .select('*')
          .eq('user_id', userId)
          .order('sr_no', { ascending: true });
        
        if (stratErr) throw stratErr;

        // Fetch strategy rules
        const { data: stratRules, error: srErr } = await supabase
          .from('strategy_rules')
          .select('*')
          .eq('user_id', userId)
          .order('rule_order', { ascending: true });

        if (srErr) throw srErr;

        // Map rules to strategies
        const mappedStrategies = (strategiesData || []).map(s => ({
          ...s,
          entryRules: (stratRules || []).filter(r => r.strategy_id === s.id && r.rule_type === 'entry')
        }));
        setStrategies(mappedStrategies);

        if (tData.length > 0) {
          const tradeIds = tData.map(t => t.id);

          // Fetch indicators score data
          const [psychRes, riskRes, rulesRes] = await Promise.all([
            supabase.from('trade_psychology').select('*').in('trade_id', tradeIds).eq('user_id', userId),
            supabase.from('trade_risk_management').select('*').in('trade_id', tradeIds).eq('user_id', userId),
            supabase.from('trade_rule_adherence').select('*').in('trade_id', tradeIds).eq('user_id', userId)
          ]);

          if (psychRes.error) console.error(psychRes.error);
          if (riskRes.error) console.error(riskRes.error);
          if (rulesRes.error) console.error(rulesRes.error);

          setPsychAll(psychRes.data || []);
          setRiskAll(riskRes.data || []);
          setRulesAll(rulesRes.data || []);
        }

      } catch (err: any) {
        console.error('AI Context loading failure:', err);
        showError(err.message || 'Error loading trading context for AI Teacher.');
      } finally {
        setLoading(false);
      }
    };

    loadPerformanceContext();
  }, [userId, showError]);

  // Load Selected Specific Trade context details
  useEffect(() => {
    if (!userId || !selectedTradeId) {
      setSpecificTrade(null);
      setSpecificTradeRules(null);
      setSpecificTradePsych(null);
      setSpecificTradeRisk(null);
      return;
    }

    const fetchSpecificContext = async () => {
      try {
        const [tradeResult, rulesResult, psychResult, riskResult] = await Promise.all([
          supabase
            .from('trades')
            .select('*, strategies(name, type_of_strategy)')
            .eq('id', selectedTradeId)
            .eq('user_id', userId)
            .single(),
          supabase
            .from('trade_rule_adherence')
            .select('*')
            .eq('trade_id', selectedTradeId)
            .eq('user_id', userId)
            .order('rule_type')
            .order('rule_order', { ascending: true }),
          supabase
            .from('trade_psychology')
            .select('*')
            .eq('trade_id', selectedTradeId)
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('trade_risk_management')
            .select('*')
            .eq('trade_id', selectedTradeId)
            .eq('user_id', userId)
            .maybeSingle(),
        ]);

        if (tradeResult.error) throw tradeResult.error;

        setSpecificTrade(tradeResult.data);
        setSpecificTradeRules(rulesResult.data || []);
        setSpecificTradePsych(psychResult.data || null);
        setSpecificTradeRisk(riskResult.data || null);

      } catch (err: any) {
        console.error('Error fetching deep trade details:', err);
        showError('Count not sync specific trade metrics.');
      }
    };

    fetchSpecificContext();
  }, [selectedTradeId, userId, showError]);

  // Local calculations
  const stats = useMemo(() => {
    if (trades.length === 0) return null;

    const overallStats = calcTradeStats(trades);
    const scoreAverages = calcScoreAverages(
      trades.map(t => t.id),
      psychAll,
      riskAll,
      rulesAll
    );

    const now = new Date();
    const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const curMonthName = MONTH_NAMES_SHORT[now.getMonth()];
    const curYear = now.getFullYear();

    const monthTradesList = trades.filter(t => t.month === curMonthName && t.year === curYear);
    const monthStats = calcTradeStats(monthTradesList);

    // Group mistakes count
    const mistakeCounts: Record<string, number> = {
      Technical: 0,
      Psychological: 0,
      'Risk Management': 0,
      'No Mistake': 0
    };

    const mistakeTextCounts: Record<string, number> = {};

    trades.forEach(t => {
      const mType = t.mistake_type || 'No Mistake';
      if (mType in mistakeCounts) {
        mistakeCounts[mType]++;
      }
      const mText = t.mistake_text;
      if (mText && mText.trim()) {
        mistakeTextCounts[mText] = (mistakeTextCounts[mText] || 0) + 1;
      }
    });

    const sortedMistakeTexts = Object.entries(mistakeTextCounts).sort((a, b) => b[1] - a[1]);
    const topRepeatedMistake: [string, number] | null = sortedMistakeTexts.length > 0 ? sortedMistakeTexts[0] as [string, number] : null;

    return {
      overall: overallStats,
      scores: scoreAverages,
      month: {
        name: curMonthName,
        year: curYear,
        count: monthTradesList.length,
        winRate: monthStats?.winRate || 0,
        pnl: monthStats?.totalPnl || 0
      },
      mistakeBreakdown: mistakeCounts,
      topMistake: topRepeatedMistake
    };
  }, [trades, psychAll, riskAll, rulesAll]);

  // Predefined prompts trigger handler
  const handlePredefined = (promptText: string) => {
    setQuestion(promptText);
  };

  // Submit trigger handler
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim() || askingAI) return;

    const userMsg = question.trim();
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAskingAI(true);

    try {
      // 1. Build string representation of all collected metrics
      let constructedPromptContext = '';
      if (stats) {
        constructedPromptContext = buildContextString({
          totalTrades: stats.overall?.totalTrades || 0,
          winRate: stats.overall?.winRate || 0,
          profitFactor: stats.overall?.profitFactor || 0,
          avgR: stats.overall?.avgR || 0,
          totalPnl: stats.overall?.totalPnl || 0,
          avgTechScore: stats.scores?.avgTech || 0,
          avgPsychScore: stats.scores?.avgPsych || 0,
          avgRiskScore: stats.scores?.avgRisk || 0,
          avgOverallScore: stats.scores?.avgOverall || 0,
          monthName: stats.month.name,
          year: stats.month.year,
          monthTrades: stats.month.count,
          monthWinRate: stats.month.winRate,
          monthPnl: stats.month.pnl,
          strategies,
          recentTrades: trades.slice(0, 15),
          mistakeBreakdown: stats.mistakeBreakdown,
          topMistake: stats.topMistake,
          specificTrade,
          specificTradeRules,
          specificTradePsych,
          specificTradeRisk
        });
      }

      // 2. Wrap context into system prompt instruction bundle
      const finalSystemPrompt = buildSystemPrompt(constructedPromptContext);

      // 3. Sent to serverless proxy route `/api/ask-ai` safely
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMsg,
          systemPrompt: finalSystemPrompt
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server responded with an entry error.');
      }

      // 4. Update conversation states
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      if (data.tokensUsed) {
        setTotalTokens(prev => prev + data.tokensUsed);
      }

    } catch (err: any) {
      console.error('Claude service query failure:', err);
      // Give very neat, visible error message in chat history as a system message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ **Coaching Service Connection Error**\n\n${err.message || 'Unable to connect to the AI model.'}\n\n*Please ensure you have configured your \`ANTHROPIC_API_KEY\` in the AI Studio Secrets panel.*`
        }
      ]);
      showError(err.message || 'AI Teacher service failed to respond.');
    } finally {
      setAskingAI(false);
    }
  };

  // Reset conversation trigger handler
  const handleResetConversation = () => {
    if (window.confirm('Do you want to reset the current coaching conversation thread?')) {
      setMessages([
        {
          role: 'assistant',
          content: `Greetings, trader. I am your TRADELYZE AI teacher and performance mentor. I have scanned your journal records, setup rules, error logs, and emotional indices.\n\nAsk me anything about your current month stats, setup adherence, psychological pitfalls, or select a specific trade below to dissect its technical or risk execution details.`
        }
      ]);
      showSuccess('Coaching session reset.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* MAIN CONTAINER AREA */}
      <div className="flex-1 md:pl-[250px] flex flex-col min-h-screen">
        {/* MOBILE TOPBAR HEADER */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-805 md:hidden bg-zinc-900 sticky top-0 z-20">
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
        <div className="flex-1 flex flex-col h-full max-h-screen overflow-hidden">
          {/* HEADER ROW WITH COUNTER */}
          <header className="px-6 py-5 border-b border-zinc-900 bg-zinc-90 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-indigo-400 animate-pulse" />
                <h1 className="text-xl font-extrabold tracking-tight text-zinc-100 font-display">
                  AI Teacher
                </h1>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">
                On-demand Claude AI performance coaching aligned with ICT frameworks.
              </p>
            </div>

            {/* TOKEN & COST STAT COUNTER PILL */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
              <div className="px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-[10px] text-zinc-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {totalTokens.toLocaleString()} tokens
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                <span className="text-indigo-400 font-bold">
                  Cost: ₹{sessionCostINR.toFixed(4)}
                </span>
              </div>
              <button
                onClick={handleResetConversation}
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl border border-zinc-800/60 hover:border-red-500/20 transition-all cursor-pointer"
                title="Clear current coaching history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* MAIN COLUMN SPLIT VIEW */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            
            {/* LEFT DATA OVERVIEW & CONTROLS RAIL (1/3 Width) */}
            <aside className="w-full lg:w-[350px] border-r border-zinc-900 bg-zinc-950 p-5 overflow-y-auto shrink-0 space-y-5">
              
              {/* SPECIFIC TRADE SELECT BOX */}
              <div className="bg-zinc-900/40 p-4 border border-zinc-900 rounded-2xl space-y-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span>Trade Focus</span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Select a specific trade. Claude will parse its checklist, rules, stress parameters, and risk ratios.
                </p>
                <select
                  value={selectedTradeId}
                  onChange={(e) => setSelectedTradeId(e.target.value)}
                  className="w-full bg-[#161821] border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer font-medium hover:border-zinc-700 transition-colors"
                >
                  <option value="">No specific trade — Overall metrics</option>
                  {trades.slice(0, 30).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.date} | {t.symbol} ({t.status}) — ₹{(t.pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </option>
                  ))}
                </select>
                {selectedTradeId && specificTrade && (
                  <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[10px] text-zinc-400 flex flex-col gap-1 space-y-0.5 animate-fadeIn">
                    <div className="font-semibold text-indigo-300 flex items-center justify-between">
                      <span>Loaded Specific Focus:</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 bg-indigo-950/80 border border-indigo-700/30 rounded text-indigo-400 font-mono">ACTIVE</span>
                    </div>
                    <div>Setup: <span className="text-zinc-350 font-medium">{specificTrade.strategies?.name || 'No Setup'}</span></div>
                    <div>R-Multiple: <span className="text-zinc-350 font-mono">{specificTrade.r_multiple?.toFixed(2) || '0'}R</span></div>
                    <div>Holding Time: <span className="text-zinc-350 font-mono">{specificTrade.holding_time_mins || '0'} mins</span></div>
                  </div>
                )}
              </div>

              {/* MENTAL PREDEFINED PROMPTS LIST */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 pl-1">
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Suggested Prompts</span>
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handlePredefined("What is my top repeated mistake and how can I resolve it using ICT concepts?")}
                    className="w-full text-left p-3 rounded-xl bg-[#12131C] border border-[#232535]/40 hover:border-indigo-500/30 hover:bg-[#161826] transition-all text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer font-medium flex items-center justify-between group"
                  >
                    <span>What is my top repeated mistake?</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all text-indigo-450" />
                  </button>
                  <button
                    onClick={() => handlePredefined("Analyze my emotional condition and discipline scores. Are there patterns?")}
                    className="w-full text-left p-3 rounded-xl bg-[#12131C] border border-[#232535]/40 hover:border-indigo-500/30 hover:bg-[#161826] transition-all text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer font-medium flex items-center justify-between group"
                  >
                    <span>Analyze emotional condition and scores?</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all text-indigo-450" />
                  </button>
                  <button
                    onClick={() => handlePredefined("Are my Win Rate and R-Multiple aligned for long-term consistency?")}
                    className="w-full text-left p-3 rounded-xl bg-[#12131C] border border-[#232535]/40 hover:border-indigo-500/30 hover:bg-[#161826] transition-all text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer font-medium flex items-center justify-between group"
                  >
                    <span>Win Rate & R-Multiple long-term consistency?</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all text-indigo-450" />
                  </button>
                  <button
                    onClick={() => handlePredefined("Provide a step-by-step trading plan to improve my risk-to-reward ratio.")}
                    className="w-full text-left p-3 rounded-xl bg-[#12131C] border border-[#232535]/40 hover:border-indigo-500/30 hover:bg-[#161826] transition-all text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer font-medium flex items-center justify-between group"
                  >
                    <span>Get a plan to improve my risk ratio</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all text-indigo-450" />
                  </button>
                </div>
              </div>

              {/* QUICK STATS PANEL BOX */}
              {!loading && stats && (
                <div className="bg-zinc-900/20 p-4 border border-zinc-900 rounded-2xl space-y-3 shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Scanned Context Variables</span>
                  </div>
                  <div className="divide-y divide-zinc-800/40 text-[11px] font-mono">
                    <div className="py-2 flex justify-between">
                      <span className="text-zinc-500">Total Scanned Trades:</span>
                      <span className="text-zinc-300 font-bold">{stats.overall?.totalTrades}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-zinc-500">Win Rate:</span>
                      <span className={`font-bold ${scoreColor(stats.overall?.winRate || 0)}`}>{stats.overall?.winRate?.toFixed(1)}%</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-zinc-500">Net Profit Factor:</span>
                      <span className="text-zinc-300 font-bold">{stats.overall?.profitFactor === 999 ? '∞' : stats.overall?.profitFactor?.toFixed(2)}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-zinc-500">Top Mistake Pattern:</span>
                      <span className="text-zinc-300 font-bold truncate max-w-[150px]">{stats.topMistake ? `"${stats.topMistake[0]}"` : 'None'}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-zinc-500">Avg Overall Score:</span>
                      <span className={`font-bold ${scoreColor(stats.scores?.avgOverall || 0)}`}>{stats.scores?.avgOverall?.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )}

            </aside>

            {/* RIGHT SIDE CHAT PANE (2/3 Width) */}
            <main className="flex-1 flex flex-col bg-zinc-950 overflow-hidden h-full">
              
              {/* THREAD CONTAINER */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Assistant Icon */}
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-indigo-400" />
                      </div>
                    )}

                    {/* Chat Bubble container */}
                    <div
                      className={`max-w-2xl px-5 py-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-[#1D1E2C] border border-[#2D304A]/60 text-zinc-100 rounded-tr-none'
                          : 'bg-zinc-900/60 border border-zinc-800/80 text-zinc-300 rounded-tl-none font-sans'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                      ) : (
                        <SimpleMarkdown content={msg.content} />
                      )}
                    </div>
                  </div>
                ))}

                {/* Claude Typing State loader indicator */}
                {askingAI && (
                  <div className="flex gap-4 justify-start animate-pulse">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0 flex items-center justify-center animate-spin">
                      <RefreshCw className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="max-w-md bg-zinc-900/40 border border-zinc-800 px-5 py-3.5 rounded-2xl rounded-tl-none flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                        <span className="font-semibold text-zinc-300 tracking-wide">Evaluating trading scores & setups...</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded w-48 animate-pulse" />
                      <div className="h-1.5 bg-zinc-800 rounded w-32 animate-pulse" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* INPUT BOX FORM BAR */}
              <div className="p-4 bg-zinc-900/40 border-t border-zinc-900/80">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3 relative">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      selectedTradeId 
                        ? "Ask about this specific trade (e.g., 'What was my anxiety level compared to the rules followed?')" 
                        : "Ask your AI Teacher about setups, mental indicators, or trading consistency..."
                    }
                    className="flex-1 min-h-[50px] max-h-[140px] bg-[#12131A] border border-zinc-800 rounded-2xl py-3.5 px-4 pr-12 text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-sans scrollbar-hide"
                    rows={1}
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || askingAI}
                    className={`absolute right-3.5 top-3 p-2.5 rounded-xl transition-all cursor-pointer ${
                      question.trim() && !askingAI
                        ? 'bg-indigo-600 border border-indigo-500 text-white hover:bg-indigo-700 hover:scale-[1.02] shadow-md shadow-indigo-600/10'
                        : 'text-zinc-600 bg-zinc-900 border border-zinc-850 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </main>

          </div>
        </div>
      </div>
    </div>
  );
};
