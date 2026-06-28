import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
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
        <strong key={idx} style={{ color: 'var(--text)' }} className="font-extrabold pb-0.5">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} style={{ backgroundColor: 'var(--bg-muted, #F4F4F5)', borderColor: 'var(--border)', color: 'var(--accent)' }} className="font-mono border rounded px-1 py-0.5 text-xs">
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
    <div style={{ color: 'var(--text-sub)' }} className="space-y-3 text-sm leading-relaxed font-sans">
      {parts.map((part, partIdx) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);

          return (
            <div key={partIdx} style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-muted, #F4F5F7)' }} className="my-3 rounded-xl border overflow-hidden font-mono text-xs shadow-inner">
              {lang && (
                <div style={{ backgroundColor: 'var(--border)', color: 'var(--text-muted)' }} className="px-4 py-1.5 border-b text-[10px] font-sans font-bold uppercase tracking-wider flex justify-between items-center">
                  <span>{lang}</span>
                </div>
              )}
              <pre className="p-4 overflow-x-auto text-indigo-750 select-all leading-relaxed whitespace-pre-wrap font-medium">
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
                  <h4 key={lineIdx} style={{ color: 'var(--text)' }} className="font-bold font-display text-sm mt-3 mb-1.5 flex items-center gap-1.5">
                    {parseInline(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lineIdx} style={{ color: 'var(--text)', borderColor: 'var(--border)' }} className="font-extrabold font-display text-base mt-4 mb-2 border-b pb-1">
                    {parseInline(trimmed.slice(3))}
                  </h3>
                );
              }
              if (trimmed.startsWith('# ')) {
                return (
                  <h2 key={lineIdx} style={{ color: 'var(--text)' }} className="font-black font-display text-lg mt-5 mb-3 pb-1">
                    {parseInline(trimmed.slice(2))}
                  </h2>
                );
              }

              if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                return (
                  <ul key={lineIdx} className="list-disc pl-5 space-y-1 my-1">
                    <li style={{ color: 'var(--text-sub)' }} className="leading-relaxed list-outside">
                      {parseInline(trimmed.slice(2))}
                    </li>
                  </ul>
                );
              }

              if (trimmed === '') {
                return <div key={lineIdx} className="h-1.5" />;
              }

              return (
                <p key={lineIdx} style={{ color: 'var(--text-sub)' }} className="leading-relaxed font-sans">
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
  const [searchParams] = useSearchParams();
  const tradeQueryId = searchParams.get('tradeId') || '';

  // Selected Specific Trade Focus
  const [selectedTradeId, setSelectedTradeId] = useState<string>(tradeQueryId);

  useEffect(() => {
    if (tradeQueryId) {
      setSelectedTradeId(tradeQueryId);
    }
  }, [tradeQueryId]);

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
      console.error('Gemini service query failure:', err);
      // Give very neat, visible error message in chat history as a system message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ **Coaching Service Connection Error**\n\n${err.message || 'Unable to connect to the AI model.'}\n\n*Please ensure you have configured your \`GEMINI_API_KEY\` in the AI Studio Secrets panel.*`
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans selection:bg-indigo-500/30" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* MAIN CONTAINER AREA */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
        {/* MOBILE TOPBAR HEADER */}
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
        <div className="flex-1 flex flex-col h-full max-h-screen overflow-hidden">
          {/* HEADER ROW WITH COUNTER */}
          <header 
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
            <div className="flex items-center gap-2">
              <Brain style={{ color: 'var(--accent)' }} className="w-6 h-6 animate-pulse" />
              <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.3px' }} className="tracking-tight font-display">
                AI Teacher
              </h1>
            </div>

            {/* TOKEN & COST STAT COUNTER PILL */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
              <div style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-sub)' }} className="px-3 py-1.5 rounded-xl border font-mono text-[10px] flex items-center gap-2">
                <Sparkles style={{ color: 'var(--accent)' }} className="w-3.5 h-3.5" />
                <span>
                  {totalTokens.toLocaleString()} tokens
                </span>
                <span style={{ backgroundColor: 'var(--border-md)' }} className="w-1.5 h-1.5 rounded-full" />
                <span style={{ color: 'var(--accent)' }} className="font-bold">
                  Cost: ₹{sessionCostINR.toFixed(4)}
                </span>
              </div>
              <button
                onClick={handleResetConversation}
                style={{ borderColor: 'var(--border)' }}
                className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-50 rounded-xl border transition-all cursor-pointer"
                title="Clear current coaching history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </header>

          <div className="px-6 py-2 shrink-0">
            <p style={{ color: 'var(--text-sub)', fontSize: '13px', fontWeight: 400 }}>
              On-demand Claude AI performance coaching aligned with ICT frameworks.
            </p>
          </div>

          {/* MAIN COLUMN SPLIT VIEW */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            
            {/* LEFT DATA OVERVIEW & CONTROLS RAIL (1/3 Width) */}
            <aside style={{ backgroundColor: 'var(--bg-sub, #FAF9F6)', borderColor: 'var(--border)' }} className="w-full lg:w-[350px] border-r p-5 overflow-y-auto shrink-0 space-y-5">
              
              {/* SPECIFIC TRADE SELECT BOX */}
              <div style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }} className="p-4 space-y-2.5">
                <div style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600 }} className="flex items-center gap-1.5">
                  <Compass style={{ color: 'var(--accent)' }} className="w-4 h-4" />
                  <span>Trade Focus</span>
                </div>
                <p style={{ color: 'var(--text-sub)', fontSize: '12px' }} className="">
                  Select a specific trade. Claude will parse its checklist, rules, stress parameters, and risk ratios.
                </p>
                <select
                  value={selectedTradeId}
                  onChange={(e) => setSelectedTradeId(e.target.value)}
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  className="w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] cursor-pointer font-medium transition-colors"
                >
                  <option value="">No specific trade — Overall metrics</option>
                  {trades.slice(0, 30).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.date} | {t.symbol} ({t.status}) — ₹{(t.pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </option>
                  ))}
                  {selectedTradeId && specificTrade && !trades.slice(0, 30).some(t => t.id === selectedTradeId) && (
                    <option key={specificTrade.id} value={specificTrade.id}>
                      {specificTrade.date} | {specificTrade.symbol} ({specificTrade.status}) — ₹{(specificTrade.pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </option>
                  )}
                </select>
                {selectedTradeId && specificTrade && (
                  <div style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--border)' }} className="p-2.5 rounded-xl border text-[10px] flex flex-col gap-1 space-y-0.5 animate-fadeIn font-medium">
                    <div style={{ color: 'var(--text)' }} className="font-semibold flex items-center justify-between">
                      <span>Loaded Specific Focus:</span>
                      <span style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }} className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold">ACTIVE</span>
                    </div>
                    <div style={{ color: 'var(--text-sub)' }}>Setup: <span style={{ color: 'var(--text)' }} className="font-semibold">{specificTrade.strategies?.name || 'No Setup'}</span></div>
                    <div style={{ color: 'var(--text-sub)' }}>R-Multiple: <span style={{ color: 'var(--text)' }} className="font-mono font-bold">{specificTrade.r_multiple?.toFixed(2) || '0'}R</span></div>
                    <div style={{ color: 'var(--text-sub)' }}>Holding Time: <span style={{ color: 'var(--text)' }} className="font-mono font-bold">{specificTrade.holding_time_mins || '0'} mins</span></div>
                  </div>
                )}
              </div>

              {/* MENTAL PREDEFINED PROMPTS LIST */}
              <div className="space-y-3">
                <h3 style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'none' }} className="flex items-center gap-1.5 pl-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Suggested Prompts</span>
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handlePredefined("What is my top repeated mistake and how can I resolve it using ICT concepts?")}
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text)' }}
                    className="w-full text-left transition-all cursor-pointer font-semibold hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center justify-between group"
                  >
                    <span>What is my top repeated mistake?</span>
                    <ArrowRight style={{ color: 'var(--accent)' }} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all font-bold" />
                  </button>
                  <button
                    onClick={() => handlePredefined("Analyze my emotional condition and discipline scores. Are there patterns?")}
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text)' }}
                    className="w-full text-left transition-all cursor-pointer font-semibold hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center justify-between group"
                  >
                    <span>Analyze emotional condition and scores?</span>
                    <ArrowRight style={{ color: 'var(--accent)' }} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all font-bold" />
                  </button>
                  <button
                    onClick={() => handlePredefined("Are my Win Rate and R-Multiple aligned for long-term consistency?")}
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text)' }}
                    className="w-full text-left transition-all cursor-pointer font-semibold hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center justify-between group"
                  >
                    <span>Win Rate & R-Multiple long-term consistency?</span>
                    <ArrowRight style={{ color: 'var(--accent)' }} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all font-bold" />
                  </button>
                  <button
                    onClick={() => handlePredefined("Provide a step-by-step trading plan to improve my risk-to-reward ratio.")}
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text)' }}
                    className="w-full text-left transition-all cursor-pointer font-semibold hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center justify-between group"
                  >
                    <span>Get a plan to improve my risk ratio</span>
                    <ArrowRight style={{ color: 'var(--accent)' }} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all font-bold" />
                  </button>
                </div>
              </div>

              {/* QUICK STATS PANEL BOX */}
              {!loading && stats && (
                <div style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }} className="p-4 space-y-3">
                  <div style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600 }} className="flex items-center gap-1.5 font-bold">
                    <Activity style={{ color: 'var(--accent)' }} className="w-3.5 h-3.5" />
                    <span>Scanned Context Variables</span>
                  </div>
                  <div style={{ borderColor: 'var(--border)' }} className="divide-y text-[11px] font-mono">
                    <div style={{ borderColor: 'var(--border)' }} className="py-2 flex justify-between">
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500 }}>Total Scanned Trades:</span>
                      <span style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>{stats.overall?.totalTrades}</span>
                    </div>
                    <div style={{ borderColor: 'var(--border)' }} className="py-2 flex justify-between">
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500 }}>Win Rate:</span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }} className={`font-bold ${scoreColor(stats.overall?.winRate || 0)}`}>{stats.overall?.winRate?.toFixed(1)}%</span>
                    </div>
                    <div style={{ borderColor: 'var(--border)' }} className="py-2 flex justify-between">
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500 }}>Net Profit Factor:</span>
                      <span style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>{stats.overall?.profitFactor === 999 ? '∞' : stats.overall?.profitFactor?.toFixed(2)}</span>
                    </div>
                    <div style={{ borderColor: 'var(--border)' }} className="py-2 flex justify-between">
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500 }}>Top Mistake Pattern:</span>
                      <span style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }} className="truncate max-w-[140px]">{stats.topMistake ? `"${stats.topMistake[0]}"` : 'None'}</span>
                    </div>
                    <div style={{ borderColor: 'var(--border)' }} className="py-2 flex justify-between border-b pb-2">
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500 }}>Avg Overall Score:</span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }} className={`font-bold ${scoreColor(stats.scores?.avgOverall || 0)}`}>{stats.scores?.avgOverall?.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )}

            </aside>

            {/* RIGHT SIDE CHAT PANE (2/3 Width) */}
            <main style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }} className="flex-1 flex flex-col overflow-hidden h-full m-4">
              
              {/* THREAD CONTAINER */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Assistant Icon */}
                    {msg.role === 'assistant' && (
                      <div style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--border)' }} className="w-8 h-8 rounded-xl border shrink-0 flex items-center justify-center">
                        <Brain style={{ color: 'var(--accent)' }} className="w-4 h-4" />
                      </div>
                    )}

                    {/* Chat Bubble container */}
                    <div
                      style={
                        msg.role === 'user'
                          ? { 
                              backgroundColor: 'var(--accent-muted)', 
                              borderLeft: '3px solid var(--accent)', 
                              borderRadius: '8px', 
                              padding: '12px 16px',
                              color: 'var(--text)' 
                            }
                          : { 
                              backgroundColor: 'var(--card)', 
                              border: '0.5px solid var(--border)', 
                              borderRadius: '8px', 
                              padding: '14px 16px',
                              color: 'var(--text-sub)' 
                            }
                      }
                      className="max-w-2xl font-sans"
                    >
                      {msg.role === 'user' ? (
                        <p style={{ color: 'var(--text)' }} className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                      ) : (
                        <SimpleMarkdown content={msg.content} />
                      )}
                    </div>
                  </div>
                ))}

                {/* Claude Typing State loader indicator */}
                {askingAI && (
                   <div className="flex gap-4 justify-start animate-pulse">
                     <div style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--border)' }} className="w-8 h-8 rounded-xl border shrink-0 flex items-center justify-center animate-spin">
                       <RefreshCw style={{ color: 'var(--accent)' }} className="w-4 h-4" />
                     </div>
                     <div style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} className="max-w-md border px-5 py-3.5 rounded-2xl rounded-tl-none flex flex-col gap-2">
                       <div className="flex items-center gap-2 text-xs">
                         <span style={{ backgroundColor: 'var(--accent)' }} className="w-2 h-2 rounded-full animate-ping" />
                         <span style={{ color: 'var(--text)' }} className="font-semibold tracking-wide">Evaluating trading stages & setups...</span>
                       </div>
                       <div style={{ backgroundColor: 'var(--border)' }} className="h-1.5 rounded w-48 animate-pulse" />
                       <div style={{ backgroundColor: 'var(--border)' }} className="h-1.5 rounded w-32 animate-pulse" />
                     </div>
                   </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* INPUT BOX FORM BAR */}
              <div style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} className="p-4 border-t">
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
                    style={{ 
                      backgroundColor: 'var(--card)', 
                      border: '0.5px solid var(--border)', 
                      borderRadius: '8px', 
                      padding: '12px 14px', 
                      fontSize: '13px', 
                      color: 'var(--text)' 
                    }}
                    className="flex-1 min-h-[50px] max-h-[140px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] resize-none font-sans scrollbar-hide pr-12 py-3"
                    rows={1}
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || askingAI}
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: question.trim() && !askingAI ? 'pointer' : 'not-allowed',
                      width: '40px',
                      height: '40px',
                      padding: '0',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: question.trim() && !askingAI ? 1 : 0.5
                    }}
                    className="absolute right-3.5 top-3 hover:opacity-90 transition-all"
                  >
                    <Send className="w-4 h-4 text-white" />
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
