import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Zap,
  MessageCircle,
  Target,
  BarChart2,
  Eye,
  Layers,
  AlertCircle,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-[#e2e8f0] font-sans antialiased select-none" style={{ backgroundColor: '#060b18' }}>
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 h-[60px] flex items-center justify-between px-6 md:px-12 border-b border-white/5 backdrop-blur-md" style={{ backgroundColor: '#060b18fb' }}>
        <div className="flex items-center gap-2">
          {/* TL Logo */}
          <svg width="28" height="26" viewBox="0 0 108 102" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="landingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>
            <path d="M16 21h45.5l-3.5 11.5H41v40H26.5v-40H16Z" fill="url(#landingGrad)" />
            <path d="M65 21h14.5L67.8 61H96l-3.5 11.5H50Z" fill="#e2e8f0" />
          </svg>
          <span className="text-lg md:text-xl font-black text-cyan-400 tracking-widest">TRADELYZE</span>
        </div>
        
        <div className="flex items-center gap-6">
          <Link to="/login" className="text-gray-400 hover:text-white transition-all text-sm font-medium">Log In</Link>
          <button
            onClick={() => navigate('/signup')}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg px-4 py-2 text-xs md:text-sm cursor-pointer transition-all shadow-md shadow-cyan-500/10"
          >
            Start Free Trial
          </button>
        </div>
      </header>

      {/* SECTION 1 — HERO */}
      <section className="relative px-6 pt-24 pb-20 md:pt-32 md:pb-28 text-center max-w-6xl mx-auto overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs rounded-full px-4 py-1.5 font-medium mb-8">
          <span>✦</span>
          <span>India's First ICT-Native Trading Journal</span>
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto text-white">
          Tradelyze learns <span className="text-cyan-400">YOU.</span>
          <br className="hidden md:block" /> Not the market.
        </h1>

        <p className="text-base md:text-xl text-gray-400 max-w-2xl mx-auto mt-6 leading-relaxed">
          The only trading journal built for ICT traders. Tracks your psychology, entry rules, and visual chart similarity. Improves automatically with every trade you log.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <button
            onClick={() => navigate('/signup')}
            className="bg-cyan-500 hover:bg-cyan-400 text-black text-base font-bold rounded-xl px-8 py-4 cursor-pointer transition-all hover:scale-[1.02] shadow-lg shadow-cyan-500/20"
          >
            Start Free Trial — 14 Days Free
          </button>
          <a
            href="#how-it-works"
            className="border border-white/20 text-gray-300 rounded-xl px-8 py-4 text-base font-semibold hover:border-white/40 hover:text-white transition-all text-center flex items-center justify-center gap-2"
          >
            See How It Works <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 justify-center mt-12 text-xs md:text-sm text-gray-500 font-medium">
          <span className="flex items-center gap-1.5">✓ No credit card required</span>
          <span className="flex items-center gap-1.5">✓ 14-day free trial</span>
          <span className="flex items-center gap-1.5">✓ Cancel anytime</span>
        </div>

        {/* HERO VISUAL - Static Mockup of Dashboard */}
        <div className="mt-16 bg-[#0c1424] border border-white/10 rounded-2xl p-4 md:p-6 shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#060b18] via-transparent to-transparent pointer-events-none rounded-2xl" />
          
          {/* Simulated Top Bar */}
          <div className="flex justify-between items-center text-xs md:text-sm text-gray-400 border-b border-white/5 pb-4 mb-4 font-mono">
            <span>DASHBOARD | JUNE 2026</span>
            <span className="text-cyan-400 font-bold">YOUR SCORE: 74%</span>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center mb-6">
            <div className="bg-[#111c34]/50 p-3 rounded-lg border border-white/5">
              <span className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider">Net P&L</span>
              <span className="text-sm md:text-base font-bold text-emerald-400">₹12,450</span>
            </div>
            <div className="bg-[#111c34]/50 p-3 rounded-lg border border-white/5">
              <span className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider">Total Trades</span>
              <span className="text-sm md:text-base font-bold text-white">23</span>
            </div>
            <div className="bg-[#111c34]/50 p-3 rounded-lg border border-white/5">
              <span className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider">Win Rate</span>
              <span className="text-sm md:text-base font-bold text-cyan-400">73%</span>
            </div>
            <div className="bg-[#111c34]/50 p-3 rounded-lg border border-white/5">
              <span className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider">Profit Factor</span>
              <span className="text-sm md:text-base font-bold text-yellow-500">3.2</span>
            </div>
            <div className="bg-[#111c34]/50 p-3 rounded-lg border border-white/5 col-span-2 md:col-span-1">
              <span className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider">R-Multiple Contribution</span>
              <span className="text-sm md:text-base font-bold text-cyan-400">+1.8R</span>
            </div>
          </div>

          {/* Simulated Equity Curve Curve */}
          <div className="bg-[#111c34]/20 rounded-xl p-4 border border-white/5 mb-6 h-[200px] flex flex-col justify-end">
            <div className="text-left text-[10px] text-gray-500 font-mono mb-2">EQUITY CURVE RECONSTRUCTION (CLIP MEMORY)</div>
            <div className="w-full h-full flex items-end">
              <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                <path
                  d="M 0 100 Q 50 90 100 80 T 150 70 T 200 85 T 250 50 T 300 40 T 350 20 T 400 30 T 450 15 T 500 5"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="3"
                />
                <circle cx="500" cy="5" r="4" fill="#06b6d4" />
              </svg>
            </div>
          </div>

          {/* Three Donuts Indicator Simulation */}
          <div className="grid grid-cols-3 gap-4 justify-items-center py-2 text-center text-xs text-gray-400">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full border-4 border-emerald-500 flex items-center justify-center font-bold text-white text-[9px]">90%</div>
              <span className="text-[10px]">Technical Adherence</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full border-4 border-cyan-500 flex items-center justify-center font-bold text-white text-[9px]">78%</div>
              <span className="text-[10px]">Psychology Alignment</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full border-4 border-cyan-400 flex items-center justify-center font-bold text-white text-[9px]">84%</div>
              <span className="text-[10px]">Risk Conformity</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — THREE LAYERS */}
      <section id="how-it-works" className="px-6 py-24 border-t border-white/5 scroll-mt-10" style={{ backgroundColor: '#060b18' }}>
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider block mb-2">How Tradelyze Works</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">Three layers. One intelligent system.</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left">
            
            {/* Layer 1 — Review */}
            <div className="bg-[#0c1424] border border-white/5 rounded-2xl p-6 relative">
              <div className="absolute top-6 right-6 font-mono text-cyan-500/20 text-4xl font-black">01</div>
              <div className="bg-cyan-500/10 p-3 rounded-xl w-12 h-12 flex items-center justify-center mb-6">
                <BookOpen className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Review</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Log every trade with complete context — entry/exit rules, psychology ratings, mistakes, and chart screenshots. The journal learns your patterns automatically.
              </p>
              <ul className="text-sm text-gray-500 space-y-2 mt-auto border-t border-white/5 pt-4">
                <li>✓ 6-dimension psychology scoring</li>
                <li>✓ Setup-specific rule checklists</li>
                <li>✓ Automated performance analytics</li>
              </ul>
            </div>

            {/* Layer 2 — Live */}
            <div className="bg-[#0c1424] border-2 border-cyan-500/30 rounded-2xl p-6 relative shadow-lg shadow-cyan-500/5">
              <div className="absolute top-6 right-6 font-mono text-cyan-500/20 text-4xl font-black">02</div>
              <div className="bg-cyan-500/10 p-3 rounded-xl w-12 h-12 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Live</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Chrome extension scans TradingView in real-time. Compares live charts to your winning trades visually. Shows your personal confidence score — not a generic signal.
              </p>
              <ul className="text-sm text-gray-500 space-y-2 mt-auto border-t border-white/5 pt-4">
                <li className="text-cyan-400 font-medium">✓ CLIP visual similarity engine</li>
                <li>✓ ICT rules auto-checker</li>
                <li>✓ Runs free on your device</li>
              </ul>
            </div>

            {/* Layer 3 — Teach */}
            <div className="bg-[#0c1424] border border-white/5 rounded-2xl p-6 relative">
              <div className="absolute top-6 right-6 font-mono text-cyan-500/20 text-4xl font-black">03</div>
              <div className="bg-cyan-500/10 p-3 rounded-xl w-12 h-12 flex items-center justify-center mb-6">
                <MessageCircle className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Teach</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Ask Claude about your trading patterns. Get coaching based on your actual trade history — psychology trends, mistake patterns, setup performance.
              </p>
              <ul className="text-sm text-gray-500 space-y-2 mt-auto border-t border-white/5 pt-4">
                <li>✓ Claude AI teacher</li>
                <li>✓ Full context of your data</li>
                <li>✓ On-demand, never automatic</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3 — KEY DIFFERENTIATORS */}
      <section className="px-6 py-24 border-t border-white/5" style={{ backgroundColor: '#0a0f1e' }}>
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">Built different. For ICT traders.</h2>
          <p className="text-gray-400 mt-3 max-w-lg mx-auto">
            Pine Script tells every trader the same thing. Tradelyze tells YOU about YOU.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
            
            <div className="bg-[#0c1424]/40 border border-white/5 rounded-xl p-6 hover:border-white/15 transition-all">
              <div className="text-cyan-400 mb-4"><Target className="w-8 h-8" /></div>
              <h4 className="text-lg font-bold text-white mb-2">Setup-Specific Rules</h4>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
                Each setup has its own entry/exit rules. The system scores your adherence automatically — not generic trade tags.
              </p>
            </div>

            <div className="bg-[#0c1424]/40 border border-white/5 rounded-xl p-6 hover:border-white/15 transition-all">
              <div className="text-cyan-400 mb-4"><BarChart2 className="w-8 h-8" /></div>
              <h4 className="text-lg font-bold text-white mb-2">5-Dimensional Scoring</h4>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
                Technical execution, psychology (6 sub-metrics), and risk management — scored per trade, tracked over time.
              </p>
            </div>

            <div className="bg-[#0c1424]/40 border border-white/5 rounded-xl p-6 hover:border-white/15 transition-all">
              <div className="text-cyan-400 mb-4"><Eye className="w-8 h-8" /></div>
              <h4 className="text-lg font-bold text-white mb-2">Visual Pattern Memory</h4>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
                CLIP AI analyzes your chart screenshots and finds visually similar past trades from YOUR history. Not public patterns.
              </p>
            </div>

            <div className="bg-[#0c1424]/40 border border-white/5 rounded-xl p-6 hover:border-white/15 transition-all">
              <div className="text-cyan-400 mb-4"><Layers className="w-8 h-8" /></div>
              <h4 className="text-lg font-bold text-white mb-2">ICT-Native Architecture</h4>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
                Built around OB, FVG, Liquidity, CHoCH, MSS, Killzones, PO3. The language is ICT from the ground up.
              </p>
            </div>

            <div className="bg-[#0c1424]/40 border border-white/5 rounded-xl p-6 hover:border-white/15 transition-all">
              <div className="text-cyan-400 mb-4"><AlertCircle className="w-8 h-8" /></div>
              <h4 className="text-lg font-bold text-white mb-2">Complete Mistake Taxonomy</h4>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
                Technical, Psychological, Risk Management mistakes tracked. See your most repeated mistake and when it spikes.
              </p>
            </div>

            <div className="bg-[#0c1424]/40 border border-white/5 rounded-xl p-6 hover:border-white/15 transition-all">
              <div className="text-cyan-400 mb-4"><Activity className="w-8 h-8" /></div>
              <h4 className="text-lg font-bold text-white mb-2">Free Live Scanning</h4>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
                CLIP runs on YOUR device. Zero API calls. Zero cost per scan. Scales to 10,000 users without adding server cost.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4 — COMPARISON TABLE */}
      <section className="px-6 py-24 border-t border-white/5" style={{ backgroundColor: '#060b18' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-12">vs. Pine Script ICT Indicators</h2>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left font-mono text-sm">
              <thead>
                <tr className="bg-[#0c1424] text-gray-300 border-b border-white/5">
                  <th className="p-4">Feature</th>
                  <th className="p-4 text-center">Pine Script</th>
                  <th className="p-4 text-center text-cyan-400">Tradelyze</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/[0.01]">
                  <td className="p-4 font-sans font-medium text-white text-xs md:text-sm">Detects ICT concepts</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">✓</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr className="bg-white/[0.01] hover:bg-white/[0.02]">
                  <td className="p-4 font-sans font-medium text-white text-xs md:text-sm">Same for all traders</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">✓</td>
                  <td className="p-4 text-center text-red-500 font-bold">✗</td>
                </tr>
                <tr className="hover:bg-white/[0.01]">
                  <td className="p-4 font-sans font-medium text-white text-xs md:text-sm">Knows YOUR win rates</td>
                  <td className="p-4 text-center text-red-500 font-bold">✗</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr className="bg-white/[0.01] hover:bg-white/[0.02]">
                  <td className="p-4 font-sans font-medium text-white text-xs md:text-sm">Visual similarity to YOUR trades</td>
                  <td className="p-4 text-center text-red-500 font-bold">✗</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr className="hover:bg-white/[0.01]">
                  <td className="p-4 font-sans font-medium text-white text-xs md:text-sm">Knows YOUR psychology patterns</td>
                  <td className="p-4 text-center text-red-500 font-bold">✗</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr className="bg-white/[0.01] hover:bg-white/[0.02]">
                  <td className="p-4 font-sans font-medium text-white text-xs md:text-sm">Integrated with your journal</td>
                  <td className="p-4 text-center text-red-500 font-bold">✗</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr className="hover:bg-white/[0.01]">
                  <td className="p-4 font-sans font-medium text-white text-xs md:text-sm">Improves with your data</td>
                  <td className="p-4 text-center text-red-500 font-bold">✗</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">✓</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-500 italic text-xs md:text-sm mt-6 block">
            "The wall cannot be fixed by better Pine Script code. It is architectural."
          </p>
        </div>
      </section>

      {/* SECTION 5 — PRICING PREVIEW */}
      <section className="px-6 py-24 border-t border-white/5" style={{ backgroundColor: '#0a0f1e' }}>
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider block mb-2">Flexible plans</span>
          <h2 className="text-3xl font-extrabold text-white mb-12">Simple pricing.</h2>

          <div className="bg-[#0c1424] border border-cyan-500/30 rounded-2xl p-6 md:p-8 max-w-sm mx-auto shadow-xl hover:scale-[1.01] transition-all relative">
            <div className="absolute top-4 right-4 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-cyan-500/20">
              PRO
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 text-left">Pro Plan</h3>
            <div className="text-left mt-4 mb-4">
              <span className="text-5xl font-black text-cyan-400">₹1,999</span>
              <span className="text-gray-400 text-sm"> / month</span>
            </div>
            <p className="text-gray-400 text-xs text-left mb-6">Everything. No limits. No per-token coaching fees.</p>

            <ul className="text-left space-y-3.5 mb-8 text-xs md:text-sm text-gray-300 border-t border-white/5 pt-6">
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> Unlimited trade logging
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> All reports and analytics
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> AI Teacher (Claude-powered)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> Chrome Extension (Tradelyze Live)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> Visual similarity engine
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> ICT rule checklists
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> Psychology tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> Priority customer support
              </li>
            </ul>

            <button
              onClick={() => navigate('/signup')}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold p-3 rounded-xl cursor-pointer transition-all text-sm"
            >
              Start 14-Day Free Trial
            </button>
            <span className="block text-[11px] text-gray-500 mt-3">Free for 14 days. Then ₹1,999/month. Cancel anytime.</span>
          </div>
        </div>
      </section>

      {/* SECTION 6 — FINAL CTA */}
      <section className="px-6 py-24 text-center max-w-4xl mx-auto relative overflow-hidden" style={{ backgroundColor: '#060b18' }}>
        <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4">Ready to understand your trading?</h2>
        <p className="text-gray-400 text-base md:text-lg mb-8 max-w-xl mx-auto">
          Join professional ICT traders who track their edge and trade conformity with Tradelyze.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/signup')}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl px-8 py-3.5 cursor-pointer text-sm md:text-base transition-all"
          >
            Start Free Trial
          </button>
          <button
            onClick={() => navigate('/pricing')}
            className="border border-white/10 hover:border-white/20 text-gray-300 rounded-xl px-8 py-3.5 cursor-pointer text-sm md:text-base transition-all"
          >
            View Pricing Details
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#040609] border-t border-white/5 py-12 px-6 md:px-12 text-sm text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="font-extrabold text-white text-lg tracking-wide">TRADELYZE</span>
            </div>
            <p className="text-xs text-gray-400">Learns YOU. Not the market.</p>
          </div>

          <div className="flex gap-8 text-xs text-gray-400">
            <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">Dashboard</Link>
            <Link to="/pricing" className="hover:text-cyan-400 transition-colors">Pricing</Link>
            <Link to="/login" className="hover:text-cyan-400 transition-colors">Login</Link>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-400 font-medium">© 2026 VPDP Tradelyze Tech Pvt Ltd</p>
            <p className="text-[11px] text-gray-600 mt-0.5">Bengaluru, India</p>
          </div>
        </div>

        <p className="max-w-6xl mx-auto text-center mt-12 text-[10px] text-gray-600 leading-relaxed border-t border-white/5 pt-6 select-none">
          Tradelyze is a trading performance analysis platform and is not a financial advisor, broker, or asset management service. Financial asset trading carries structural risks of capital loss. Trade diligently at your own responsibility and risk.
        </p>
      </footer>

    </div>
  );
}
