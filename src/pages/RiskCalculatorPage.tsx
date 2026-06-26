import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import { Menu, Calculator, Copy, HelpCircle, Check, DollarSign } from 'lucide-react';

interface InstrumentConfig {
  name: string;
  label: string;
  pipValue: number; // multiplier per point or pip in INR
  unitLabel: string; // lots or units
}

const INSTRUMENTS: InstrumentConfig[] = [
  { name: 'XAUUSD', label: 'Gold (XAUUSD)', pipValue: 83, unitLabel: 'Lots' },
  { name: 'BTCUSDT', label: 'Bitcoin (BTCUSDT)', pipValue: 83, unitLabel: 'Units' },
  { name: 'BANKNIFTY', label: 'Nifty Bank (BANKNIFTY)', pipValue: 40, unitLabel: 'Lots (25 qty)' },
  { name: 'NIFTY', label: 'Nifty 50 (NIFTY)', pipValue: 50, unitLabel: 'Lots (50 qty)' },
  { name: 'EURUSD', label: 'EUR/USD', pipValue: 830, unitLabel: 'Lots (100k standard)' },
  { name: 'GBPUSD', label: 'GBP/USD', pipValue: 830, unitLabel: 'Lots (100k standard)' },
  { name: 'USDJPY', label: 'USD/JPY', pipValue: 580, unitLabel: 'Lots' },
  { name: 'Custom', label: 'Custom Asset', pipValue: 1, unitLabel: 'Units/Lots' },
];

export default function RiskCalculatorPage() {
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [mobileOpen, setMobileOpen] = useState(false);

  // States
  const [accountSize, setAccountSize] = useState<number>(100000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [selectedInstName, setSelectedInstName] = useState<string>('BANKNIFTY');
  
  const [entryPrice, setEntryPrice] = useState<number>(44000);
  const [stopLoss, setStopLoss] = useState<number>(43900);
  const [takeProfit, setTakeProfit] = useState<number>(44300);

  // Calculated helper outputs
  const [slPoints, setSlPoints] = useState<number>(100);
  const [riskAmount, setRiskAmount] = useState<number>(1000);
  const [positionSize, setPositionSize] = useState<number>(0.25);
  const [rMultiple, setRMultiple] = useState<number>(3);
  const [potentialProfit, setPotentialProfit] = useState<number>(3000);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Auto-calculate on state updates
  useEffect(() => {
    // 1. Calculate Risk Amount
    const calculatedRiskAmt = accountSize * (riskPercent / 100);
    setRiskAmount(calculatedRiskAmt);

    // 2. Stop Loss in Points
    const calculatedSlPoints = Math.abs(entryPrice - stopLoss);
    setSlPoints(calculatedSlPoints);

    // Get current instrument settings
    const activeInst = INSTRUMENTS.find((inst) => inst.name === selectedInstName) || INSTRUMENTS[0];

    // 3. Position Sizing
    // Position Size = riskAmount / (slPoints * pipValue)
    if (calculatedSlPoints > 0 && activeInst.pipValue > 0) {
      const calculatedSize = calculatedRiskAmt / (calculatedSlPoints * activeInst.pipValue);
      // Let's format position size to 2 decimal places or 3 of fine-grained precision
      setPositionSize(Math.max(0.001, parseFloat(calculatedSize.toFixed(3))));
    } else {
      setPositionSize(0);
    }

    // 4. Reward to Risk and Potential Profit (ROI if winner)
    if (calculatedSlPoints > 0) {
      const rewardPoints = Math.abs(takeProfit - entryPrice);
      const rrRatio = rewardPoints / calculatedSlPoints;
      setRMultiple(parseFloat(rrRatio.toFixed(2)));

      const rewardAmt = calculatedRiskAmt * rrRatio;
      setPotentialProfit(Math.round(rewardAmt));
    } else {
      setRMultiple(0);
      setPotentialProfit(0);
    }

  }, [accountSize, riskPercent, selectedInstName, entryPrice, stopLoss, takeProfit]);

  const handleCopyValue = (value: string, fieldName: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(fieldName);
    showSuccess(`Copied "${value}" to clipboard!`);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-sm" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  const activeInst = INSTRUMENTS.find((inst) => inst.name === selectedInstName) || INSTRUMENTS[0];

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR CONTAINER */}
      <Sidebar userEmail={user?.email || ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* MAIN SCREEN AREA */}
      <main className="flex-1 overflow-y-auto w-full min-w-0 overflow-x-hidden px-0">
        
        {/* HEADER */}
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
          className="sticky top-0 z-10"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg"
              style={{ color: 'var(--text-sub)' }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="tracking-tight" style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.3px' }}>Risk Calculator</h1>
          </div>
          <div />
        </div>

        {/* CONTAINER FOR SPACING */}
        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
          
          {/* PARENT FLEX/GRID CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT INPUTS COLUMN (COL SPAN 7) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* SECTION 1: ACCOUNT DETAILS */}
              <div 
                style={{ 
                  backgroundColor: 'var(--card)', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: '12px'
                }} 
                className="p-5 md:p-6 space-y-4"
              >
                <h3 className="flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', textTransform: 'none' }}>
                  <Calculator className="w-4 h-4" style={{ color: 'var(--accent)' }} /> 1. Account Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label 
                      className="block mb-1.5"
                      style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}
                    >
                      Account Size (₹)
                    </label>
                    <input
                      type="number"
                      value={accountSize}
                      onChange={(e) => setAccountSize(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ 
                        background: 'var(--card)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px', 
                        fontSize: '14px', 
                        color: 'var(--text)',
                        padding: '8px 12px'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.outline = 'none';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                      className="w-full font-mono font-bold"
                    />
                  </div>
                  
                  <div>
                    <label 
                      className="block mb-1.5"
                      style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}
                    >
                      Risk Exposure (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ 
                        background: 'var(--card)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px', 
                        fontSize: '14px', 
                        color: 'var(--text)',
                        padding: '8px 12px'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.outline = 'none';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                      className="w-full font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Quick percentage tabs */}
                <div className="flex gap-2">
                  {[0.5, 1.0, 1.5, 2.0].map((pct) => {
                    const isActive = riskPercent === pct;
                    return (
                      <button
                        key={pct}
                        onClick={() => setRiskPercent(pct)}
                        style={isActive ? {
                          background: 'var(--accent-muted)',
                          border: '2px solid var(--accent)',
                          color: 'var(--accent)',
                          fontWeight: 600,
                          borderRadius: '20px',
                          padding: '5px 14px'
                        } : {
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-sub)',
                          fontWeight: 400,
                          borderRadius: '20px',
                          padding: '5px 14px'
                        }}
                        className="flex-1 text-xs font-mono transition-colors cursor-pointer"
                      >
                        {pct}%
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2 & 3: SETUP DETAILS */}
              <div 
                style={{ 
                  backgroundColor: 'var(--card)', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: '12px'
                }} 
                className="p-5 md:p-6 space-y-4"
              >
                <h3 className="flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', textTransform: 'none' }}>
                  <Calculator className="w-4 h-4" style={{ color: 'var(--accent)' }} /> 2. Setup Parameters
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label 
                      className="block mb-1.5"
                      style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}
                    >
                      Instrument
                    </label>
                    <select
                      value={selectedInstName}
                      onChange={(e) => setSelectedInstName(e.target.value)}
                      style={{ 
                        background: 'var(--card)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px', 
                        fontSize: '14px', 
                        color: 'var(--text)',
                        padding: '8px 12px'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.outline = 'none';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                      className="w-full"
                    >
                      {INSTRUMENTS.map((inst) => (
                        <option key={inst.name} value={inst.name}>
                          {inst.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label 
                      className="block mb-1.5"
                      style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}
                    >
                      Entry Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ 
                        background: 'var(--card)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px', 
                        fontSize: '14px', 
                        color: 'var(--text)',
                        padding: '8px 12px'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.outline = 'none';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                      className="w-full font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label 
                      className="block mb-1.5"
                      style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}
                    >
                      Stop Loss Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ 
                        background: 'var(--card)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px', 
                        fontSize: '14px', 
                        color: 'var(--text)',
                        padding: '8px 12px'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.outline = 'none';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                      className="w-full font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label 
                      className="block mb-1.5"
                      style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}
                    >
                      Take Profit Price <span className="font-normal text-xs" style={{ textTransform: 'none', color: 'var(--text-muted)' }}>(Optional, for absolute ROI estimates)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ 
                        background: 'var(--card)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px', 
                        fontSize: '14px', 
                        color: 'var(--text)',
                        padding: '8px 12px'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.outline = 'none';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                      className="w-full font-mono font-bold"
                    />
                  </div>
                </div>

                <div 
                  className="p-3 bg-[var(--bar)] rounded-xl border border-[var(--border)] flex justify-between items-center text-xs"
                >
                  <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>Stop Loss Distance:</span>
                  <span className="font-mono py-0.5 px-3 rounded-md" style={{ color: 'var(--accent)', fontWeight: 600, backgroundColor: 'var(--accent-muted)' }}>
                    {slPoints.toLocaleString(undefined, { maximumFractionDigits: 4 })} Points
                  </span>
                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR RESULTS PANEL (COL SPAN 5) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* RESULTS CARD */}
              <div 
                className="p-6 space-y-6"
                style={{ 
                  backgroundColor: 'var(--card)',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '16px',
                  overflow: 'hidden'
                }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', textTransform: 'none' }}>
                  Calculated Risk Profile
                </h3>

                {/* 4 results grid */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* RISK BOX */}
                  <div 
                    style={{ 
                      backgroundColor: 'var(--bar)', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      minHeight: 'unset'
                    }}
                    className="p-3 flex flex-col justify-between relative select-all group"
                  >
                    <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Risk Amount</span>
                    <span className="font-mono mt-1" style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word', color: '#ef4444' }}>₹{riskAmount.toLocaleString('en-IN')}</span>
                    <button
                      onClick={() => handleCopyValue(`₹${riskAmount}`, 'risk')}
                      className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-muted)' }}>Absolute Loss Capital</span>
                  </div>

                  {/* POSITION SIZE BOX */}
                  <div 
                    style={{ 
                      backgroundColor: 'var(--bar)', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      minHeight: 'unset'
                    }}
                    className="p-3 flex flex-col justify-between relative select-all group"
                  >
                    <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Position Size</span>
                    <span className="font-mono mt-1" style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word', color: 'var(--accent)' }}>
                      {positionSize} {activeInst.unitLabel}
                    </span>
                    <button
                      onClick={() => handleCopyValue(`${positionSize}`, 'posSize')}
                      className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-muted)' }}>Exact sizing entry</span>
                  </div>

                  {/* R-R RATIO */}
                  <div 
                    style={{ 
                      backgroundColor: 'var(--bar)', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      minHeight: 'unset'
                    }}
                    className="p-3 flex flex-col justify-between relative select-all group"
                  >
                    <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Reward:Risk Ratio</span>
                    <span className="font-mono mt-1" style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word', color: 'var(--accent)' }}>{rMultiple}:1 R:R</span>
                    <button
                      onClick={() => handleCopyValue(`${rMultiple}:1`, 'rr')}
                      className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-muted)' }}>Strategy Adherence</span>
                  </div>

                  {/* POTENTIAL POTENTIAL PROFIT */}
                  <div 
                    style={{ 
                      backgroundColor: 'var(--bar)', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      minHeight: 'unset'
                    }}
                    className="p-3 flex flex-col justify-between relative select-all group"
                  >
                    <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Potential Profit</span>
                    <span className="font-mono mt-1" style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word', color: '#22c55e' }}>₹{potentialProfit.toLocaleString('en-IN')}</span>
                    <button
                      onClick={() => handleCopyValue(`₹${potentialProfit}`, 'profit')}
                      className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-muted)' }}>Est. Reward Gain</span>
                  </div>

                </div>

                {/* SIZING BREAKDOWN DESCRIPTION */}
                <div className="p-4 bg-[var(--row)] rounded-xl border border-[var(--border)] text-xs leading-relaxed space-y-2 text-[var(--text-sub)] font-sans">
                  <p>
                    For <strong className="text-[var(--text)]">{activeInst.name}</strong>: With Entry at <strong className="text-[var(--text)]">{entryPrice}</strong> and Stop Loss at <strong className="text-[var(--text)]">{stopLoss}</strong>:
                  </p>
                  <p>
                    ✓ Maximum loss if Stop Loss is hit: <strong className="text-red-400 font-mono">₹{riskAmount.toLocaleString('en-IN')}</strong>.
                  </p>
                  <p>
                    ✓ This represents exactly <strong className="text-[var(--text)] font-mono">{riskPercent}%</strong> of your <strong className="text-[var(--text)] font-mono">₹{accountSize.toLocaleString('en-IN')}</strong> base account size.
                  </p>
                </div>

                {/* DISCLAIMER WARNING */}
                <p className="text-[10px] text-[var(--text-muted)] leading-normal mt-4 border-t border-[var(--border)] pt-4">
                  Note: Values are calculated dynamically based on predefined exchange and index lot multipliers. Validate final lots with your broker dashboard before actual submission.
                </p>
              </div>

            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
