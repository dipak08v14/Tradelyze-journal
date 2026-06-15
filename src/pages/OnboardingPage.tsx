import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Check, ArrowRight, Layers, Target, ScrollText, Play, ServerCrash } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, userId, userData, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Strategy step
  const [strategyName, setStrategyName] = useState('');
  const [strategyType, setStrategyType] = useState<'Breakout' | 'Reversal' | 'Neutral'>('Neutral');
  const [rule1, setRule1] = useState('');
  const [rule2, setRule2] = useState('');
  const [rule3, setRule3] = useState('');

  // If already onboarding complete, go to dashboard
  if (!authLoading && user && userData?.onboarding_completed) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleNextStep = () => {
    setStep((prev) => Math.min(4, prev + 1));
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSaveStrategy = async () => {
    if (!strategyName.trim()) {
      showError('Please enter a strategy name или skip.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Insert strategy
      const { data: strategyData, error: strategyError } = await supabase
        .from('strategies')
        .insert({
          user_id: userId,
          name: strategyName.trim(),
          type_of_strategy: strategyType,
          sr_no: 1,
          status: 'active',
        })
        .select()
        .single();

      if (strategyError) throw strategyError;

      // 2. Insert any non-empty entry rules
      const rulesToInsert = [];
      let index = 1;
      if (rule1.trim()) {
        rulesToInsert.push({
          strategy_id: strategyData.id,
          user_id: userId,
          rule_type: 'entry',
          rule_order: index++,
          rule_text: rule1.trim()
        });
      }
      if (rule2.trim()) {
        rulesToInsert.push({
          strategy_id: strategyData.id,
          user_id: userId,
          rule_type: 'entry',
          rule_order: index++,
          rule_text: rule2.trim()
        });
      }
      if (rule3.trim()) {
        rulesToInsert.push({
          strategy_id: strategyData.id,
          user_id: userId,
          rule_type: 'entry',
          rule_order: index++,
          rule_text: rule3.trim()
        });
      }

      if (rulesToInsert.length > 0) {
        const { error: rulesError } = await supabase
          .from('strategy_rules')
          .insert(rulesToInsert);

        if (rulesError) throw rulesError;
      }

      showSuccess('First setup strategy saved! ✓');
      setStep(3);
    } catch (err: any) {
      console.error('Error saving onboard strategy:', err);
      showError(err.message || 'Could not save strategy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', userId);

      if (error) throw error;

      showSuccess('Onboarding setup complete! Welcome aboard.');
      // Force page reload to sync authentication state immediately
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      showError(err.message || 'Error occurred while saving profile state.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  const progressPct = Math.round((step / 4) * 100);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 font-sans select-none" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <div className="w-full max-w-2xl bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* PROGRESS INDICATOR */}
        <div className="mb-8">
          <div className="flex justify-between items-center text-xs text-[var(--text-sub)] font-mono mb-2 uppercase tracking-wider">
            <span>Progress wizard</span>
            <span className="text-[var(--accent)] font-bold">Step {step} of 4</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bar)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <div className="text-center animate-fade-in">
            <div className="bg-[var(--accent-muted)] p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-[var(--accent)]" />
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
              Welcome to Tradelyze, {userData?.full_name || 'Trader'}!
            </h1>
            <p className="text-sm text-[var(--text-sub)] mb-8 max-w-md mx-auto leading-relaxed">
              Your personal ICT trading intelligence system is fully launched and ready.
            </p>

            <div className="text-left max-w-md mx-auto space-y-4 mb-8">
              <div className="flex items-start gap-3 bg-[var(--bar)] p-3 rounded-xl border border-[var(--border)]">
                <span className="text-[var(--accent)] font-bold text-lg leading-none mt-0.5">📊</span>
                <div>
                  <h4 className="font-semibold text-xs md:text-sm">Log custom setup checklist</h4>
                  <p className="text-xs text-[var(--text-sub)]">Validate exact entry rules, emotional triggers, and screenshots per trade.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-[var(--bar)] p-3 rounded-xl border border-[var(--border)]">
                <span className="text-[var(--accent)] font-bold text-lg leading-none mt-0.5">🔴</span>
                <div>
                  <h4 className="font-semibold text-xs md:text-sm">Get visual similarity matches</h4>
                  <p className="text-xs text-[var(--text-sub)]">Real-time scan finds visual correlates from winning records of yours.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-[var(--bar)] p-3 rounded-xl border border-[var(--border)]">
                <span className="text-[var(--accent)] font-bold text-lg leading-none mt-0.5">🤖</span>
                <div>
                  <h4 className="font-semibold text-xs md:text-sm">Coaching with Claude AI</h4>
                  <p className="text-xs text-[var(--text-sub)] font-sans">Interact with Claude for pattern alignment and psychology mentorship.</p>
                </div>
              </div>
            </div>

            {userData?.subscription_plan === 'free' && (
              <div className="bg-amber-950/40 border border-amber-800 text-amber-200 text-xs p-4 rounded-xl max-w-md mx-auto mb-8 font-medium">
                ⏱ Your 14-day free trial has officially started. Enjoy full access to everything!
              </div>
            )}

            <button
              onClick={handleNextStep}
              className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-slate-950 font-bold px-6 py-3 rounded-xl cursor-pointer text-sm transition-all inline-flex items-center gap-2 shadow-md hover:scale-[1.01]"
            >
              Set up first strategy <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: ADD STRATEGY */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-1">Define your first trading setup</h2>
            <p className="text-xs md:text-sm text-[var(--text-sub)] mb-6">
              Strategies are your foundation. Your custom checklists, entry-rules, and your edge.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Strategy Name
                  </label>
                  <input
                    type="text"
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    placeholder="e.g. London Killzone Reversal"
                    style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                    className="rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Type
                  </label>
                  <select
                    value={strategyType}
                    onChange={(e) => setStrategyType(e.target.value as any)}
                    style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                    className="rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
                  >
                    <option value="Neutral">Neutral</option>
                    <option value="Breakout">Breakout</option>
                    <option value="Reversal">Reversal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                  Entry Checklists Rules (Up to 3)
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={rule1}
                    onChange={(e) => setRule1(e.target.value)}
                    placeholder="Rule #1 Suggestions: Sweep of HTF high/low liquidity"
                    style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                    className="rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-xs"
                  />
                  <input
                    type="text"
                    value={rule2}
                    onChange={(e) => setRule2(e.target.value)}
                    placeholder="Rule #2 Suggestions: Market Structure Shift with Displacement"
                    style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                    className="rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-xs"
                  />
                  <input
                    type="text"
                    value={rule3}
                    onChange={(e) => setRule3(e.target.value)}
                    placeholder="Rule #3 Suggestions: Retracement to FVG Optimal Trade Entry"
                    style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                    className="rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs font-semibold underline text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                Skip strategy setup for now →
              </button>
              <button
                onClick={handleSaveStrategy}
                disabled={submitting}
                className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {submitting ? 'Saving Strategy...' : 'Save and Continue'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LOG FIRST TRADE */}
        {step === 3 && (
          <div className="text-center animate-fade-in">
            <div className="bg-[var(--accent-muted)] p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <ScrollText className="w-8 h-8 text-[var(--accent)]" />
            </div>

            <h2 className="text-2xl font-bold mb-1">Log your first trade</h2>
            <p className="text-xs md:text-sm text-[var(--text-sub)] mb-8 max-w-sm mx-auto">
              Even logging recent historical trades builds your pattern memory immediately.
            </p>

            <div className="flex flex-col gap-3 max-w-xs mx-auto mb-8">
              <button
                onClick={() => navigate('/trade-entry')}
                className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-slate-950 font-bold p-3 rounded-xl cursor-pointer text-sm shadow-md transition-all"
              >
                Go to Trade Entry Page →
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-sub)] underline font-semibold cursor-pointer"
              >
                Skip — I'll log trades later
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-normal mt-4 max-w-md mx-auto">
              Note: You can easily log trades from the "Trade Entry" tab in the left sidebar at any time.
            </p>
          </div>
        )}

        {/* STEP 4: INSTALL EXTENSION */}
        {step === 4 && (
          <div className="animate-fade-in text-center">
            <div className="bg-[var(--accent-muted)] p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <Layers className="w-8 h-8 text-[var(--accent)]" />
            </div>

            <h2 className="text-2xl font-bold mb-1">Supercharge TradingView</h2>
            <p className="text-xs md:text-sm text-[var(--text-sub)] mb-6 max-w-sm mx-auto">
              Our Chrome extension "Tradelyze Live" brings your journal intelligence directly to dry live charts.
            </p>

            <div className="text-left max-w-md mx-auto space-y-3 bg-[var(--bar)] p-4 rounded-xl border border-[var(--border)] mb-8 text-xs md:text-sm">
              <div className="flex gap-2">
                <span className="text-[var(--accent)]">⚡</span>
                <span><strong>Real-time checklists:</strong> Scores your live charts against active strategy rules instantly.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--accent)]">👁</span>
                <span><strong>Visual resemblance:</strong> Compares active structures against past success logs visually.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--accent)]">🔔</span>
                <span><strong>Smart triggers:</strong> Alerts you on TradingView if custom confidence scores are met.</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-w-xs mx-auto mb-8">
              <a
                href="https://chrome.google.com/webstore/detail/tradelyze-live"
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-3 rounded-xl cursor-pointer text-sm shadow-md transition-all block text-center"
              >
                Add to Chrome — Free
              </a>
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                disabled={submitting}
                className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-slate-950 font-black p-3.5 rounded-xl cursor-pointer text-sm shadow-md"
              >
                {submitting ? 'Completing Setup...' : 'Get Started with Dashboard'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
