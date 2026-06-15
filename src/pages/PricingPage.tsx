import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();

  const faqs = [
    {
      q: 'Is there a free trial?',
      a: 'Yes — 14 days free, full access, no credit card required.'
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. Cancel from your Settings page. No questions asked.'
    },
    {
      q: 'What payment methods are accepted?',
      a: 'UPI, credit/debit cards, net banking, and wallets via Razorpay.'
    },
    {
      q: 'Is my trading data safe?',
      a: 'Yes. Each user\'s data is completely isolated using Row Level Security (RLS) — no user can ever access another\'s data.'
    },
    {
      q: 'Does the price include the Chrome Extension?',
      a: 'Yes. Tradelyze Live (Chrome Extension) is included and free to download & run.'
    },
    {
      q: 'Will current pricing change?',
      a: 'Current pricing is locked for early users. If you subscribe now, you\'ll keep this price forever.'
    }
  ];

  return (
    <div className="min-h-screen text-[#e2e8f0] font-sans antialiased select-none" style={{ backgroundColor: '#060b18' }}>
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 h-[60px] flex items-center justify-between px-6 md:px-12 border-b border-white/5 backdrop-blur-md" style={{ backgroundColor: '#060b18fb' }}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          {/* TL Logo */}
          <svg width="28" height="26" viewBox="0 0 108 102" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pricingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>
            <path d="M16 21h45.5l-3.5 11.5H41v40H26.5v-40H16Z" fill="url(#pricingGrad)" />
            <path d="M65 21h14.5L67.8 61H96l-3.5 11.5H50Z" fill="#e2e8f0" />
          </svg>
          <span className="text-lg md:text-xl font-black text-cyan-400 tracking-widest">TRADELYZE</span>
        </div>
        
        <div className="flex items-center gap-6">
          <Link to="/" className="text-gray-400 hover:text-white transition-all text-sm font-medium flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <Link to="/login" className="text-gray-400 hover:text-white transition-all text-sm font-medium">Log In</Link>
        </div>
      </header>

      {/* HERO */}
      <section className="px-6 pt-16 pb-8 text-center max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white">Simple, honest pricing.</h1>
        <p className="text-gray-400 text-sm md:text-base mt-3">One plan. Everything included. No surprises.</p>
      </section>

      {/* PRICING CARD */}
      <section className="px-6 pb-20">
        <div className="bg-[#0c1424] border border-cyan-500/20 rounded-2xl p-6 md:p-8 max-w-lg mx-auto shadow-2xl relative">
          <div className="absolute top-4 right-4 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-cyan-500/20">
            PRO
          </div>
          
          <h2 className="text-2xl font-bold text-white">Everything Included</h2>
          <div className="mt-4 mb-4 text-left">
            <span className="text-5xl font-black text-cyan-400">₹1,999</span>
            <span className="text-gray-400 text-sm"> / month</span>
          </div>
          <p className="text-gray-400 text-xs mb-8">Full access to professional journals and AI coaching.</p>

          <button
            onClick={() => navigate('/signup')}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black p-3.5 rounded-xl cursor-pointer transition-all text-base mb-4 shadow-lg shadow-cyan-500/10"
          >
            Start 14-Day Free Trial
          </button>
          <p className="text-xs text-gray-500 text-center mb-8">No credit card required. Cancel anytime with a single click.</p>

          <div className="border-t border-white/5 pt-6">
            <h3 className="text-white font-bold text-sm mb-4">FEATURES EXPANDED</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm text-gray-300">
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Unlimited trade logging</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>All 6 psychology metrics</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Setup-specific checklists</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Technical / Psych scoring</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Dashboard with equity curves</span>
                </li>
              </ul>

              <ul className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Monthly + Annual reports</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>AI Teacher (Claude model)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Tradelyze Live Extension</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Visual similarity match</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>ICT-native architecture</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="px-6 py-24 border-t border-white/5 bg-[#0a0f1e]/40">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white text-center mb-12">Frequently Asked Questions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#0c1424] border border-white/5 rounded-xl p-5 md:p-6">
                <h4 className="text-base font-bold text-white mb-2">{faq.q}</h4>
                <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-400 text-sm">
              Any other questions? Reach us at <span className="text-cyan-400 select-all font-mono font-bold">support@tradelyze.app</span>
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
