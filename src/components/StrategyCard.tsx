import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Pencil, Zap, Trash2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StatusBadge } from './StatusBadge';
import { TypeBadge } from './TypeBadge';

export interface Strategy {
  id: string;
  user_id: string;
  sr_no: number;
  type_of_strategy: 'Breakout' | 'Reversal' | 'Neutral' | string;
  sub_type: string | null;
  name: string;
  reference_images: string[] | null;
  status: 'active' | 'not_working' | 'retired' | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface StrategyCardProps {
  strategy: Strategy;
  userId: string;
  onChangeStatusClick: (strategy: Strategy) => void;
  onDeleteClick: (strategy: Strategy) => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  userId,
  onChangeStatusClick,
  onDeleteClick
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [trades, setTrades] = useState<any[]>([]);
  const [rulesCount, setRulesCount] = useState<{ entry: number; exit: number }>({ entry: 0, exit: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!userId || !strategy.id) return;

    const fetchStatsAndRules = async () => {
      try {
        setLoadingStats(true);
        
        // Retrieve trades associated with this strategy
        const { data: tradesData, error: tradesErr } = await supabase
          .from('trades')
          .select('status, pnl, r_multiple, date')
          .eq('strategy_id', strategy.id)
          .eq('user_id', userId);

        if (tradesErr) throw tradesErr;

        // Retrieve rules count for this strategy
        const { data: rulesData, error: rulesErr } = await supabase
          .from('strategy_rules')
          .select('rule_type')
          .eq('strategy_id', strategy.id)
          .eq('user_id', userId);

        if (rulesErr) throw rulesErr;

        if (mounted) {
          if (tradesData) setTrades(tradesData);
          if (rulesData) {
            const entry = rulesData.filter(r => r.rule_type === 'entry').length;
            const exit = rulesData.filter(r => r.rule_type === 'exit').length;
            setRulesCount({ entry, exit });
          }
        }
      } catch (err) {
        console.error('Error fetching statistics for strategy:', strategy.name, err);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    };

    fetchStatsAndRules();
    return () => {
      mounted = false;
    };
  }, [strategy.id, strategy.name, userId]);

  // Statistics calculation helpers
  const totalTrades = trades.length;
  
  const winTrades = trades.filter((t) => t.status === 'Win').length;
  const winRate = totalTrades > 0 ? Math.round((winTrades / totalTrades) * 100) : 0;
  
  const totalR = trades.reduce((sum, t) => sum + Number(t.r_multiple || 0), 0);
  const avgR = totalTrades > 0 ? (totalR / totalTrades) : 0;

  const totalPnL = trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);

  const getWinRateColor = (rate: number) => {
    if (rate >= 60) return 'text-green-400';
    if (rate >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(absVal);
    return `${isNegative ? '-' : ''}₹ ${formatted}`;
  };

  const getRColor = (val: number) => {
    if (val > 0) return 'text-green-400';
    if (val < 0) return 'text-red-400';
    return 'text-gray-300';
  };

  const getPnLColor = (val: number) => {
    if (val > 0) return 'text-green-400';
    if (val < 0) return 'text-red-400';
    return 'text-gray-300';
  };

  const notePreview = strategy.notes && strategy.notes.trim().length > 0
    ? strategy.notes.length > 80
      ? `${strategy.notes.trim().substring(0, 80)}...`
      : strategy.notes.trim()
    : null;

  const imageCount = strategy.reference_images ? strategy.reference_images.length : 0;

  return (
    <div
      className="flex flex-col justify-between cursor-pointer group hover:-translate-y-[2px] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-[200ms]"
      style={{ 
        backgroundColor: 'var(--card)', 
        border: '0.5px solid var(--border)',
        borderRadius: '12px',
        padding: '20px'
      }}
      onClick={() => navigate(`/strategies/${strategy.id}/edit`)}
    >
      <div>
        {/* TOP ROW */}
        <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center flex-1 min-w-0 pr-2">
            <span 
              className="text-xs font-mono rounded-lg px-2.5 py-1 shrink-0"
              style={{ backgroundColor: 'var(--bar)', color: 'var(--text-muted)' }}
            >
              #{strategy.sr_no}
            </span>
            <h3 
              className="text-lg font-bold ml-2.5 truncate font-display transition-colors" 
              style={{ color: 'var(--text)' }}
              title={strategy.name}
            >
              {strategy.name}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 relative" ref={menuRef}>
            <StatusBadge status={strategy.status} />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg transition-all cursor-pointer"
              style={{ color: 'var(--text-sub)' }}
              aria-label="Strategy menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div 
                className="absolute right-0 top-full mt-1.5 rounded-xl shadow-2xl z-10 min-w-[160px] overflow-hidden"
                style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/strategies/${strategy.id}/edit`);
                  }}
                  className="w-full px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 text-left"
                  style={{ color: 'var(--text)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bar)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Pencil className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <span>Edit Strategy</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onChangeStatusClick(strategy);
                  }}
                  className="w-full px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 text-left"
                  style={{ color: 'var(--text)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bar)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <span>Change Status</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteClick(strategy);
                  }}
                  className="w-full px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 text-red-500 hover:text-red-600 text-left"
                  style={{ borderTop: '0.5px solid var(--border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bar)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SECOND ROW */}
        <div className="mt-2.5 flex items-center gap-2">
          <TypeBadge type={strategy.type_of_strategy} />
          {strategy.sub_type && strategy.sub_type.trim() && (
            <span className="text-sm truncate font-medium" style={{ color: 'var(--text-sub)' }} title={strategy.sub_type}>
              {strategy.sub_type}
            </span>
          )}
        </div>

        {/* STATS ROW */}
        <div className="mt-5">
          {loadingStats ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="animate-pulse" 
                  style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', height: '52px' }}
                />
              ))}
            </div>
          ) : totalTrades === 0 ? (
            <div 
              className="text-center"
              style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}
            >
              <span className="text-xs italic font-medium" style={{ color: 'var(--text-muted)' }}>No trades logged yet</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {/* TRADES count */}
              <div 
                className="flex flex-col justify-center"
                style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}
              >
                <span className="font-extrabold text-base tracking-tight font-display" style={{ color: 'var(--text)' }}>{totalTrades}</span>
                <span className="text-[9px] uppercase tracking-wider font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>Trades</span>
              </div>
              
              {/* WIN RATE */}
              <div 
                className="flex flex-col justify-center"
                style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}
              >
                <span className="font-extrabold text-base tracking-tight font-display" style={{ color: winRate >= 60 ? '#22c55e' : winRate >= 40 ? '#f59e0b' : '#ef4444' }}>{winRate}%</span>
                <span className="text-[9px] uppercase tracking-wider font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>Win Rate</span>
              </div>

              {/* AVG R */}
              <div 
                className="flex flex-col justify-center"
                style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}
              >
                <span className="font-extrabold text-base tracking-tight font-display" style={{ color: avgR > 0 ? '#22c55e' : avgR < 0 ? '#ef4444' : 'var(--text-sub)' }}>
                  {avgR > 0 ? '+' : ''}{avgR.toFixed(1)}R
                </span>
                <span className="text-[9px] uppercase tracking-wider font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>Avg R</span>
              </div>

              {/* TOTAL P&L */}
              <div 
                className="flex flex-col justify-center"
                style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}
              >
                <span className="font-extrabold text-base tracking-tight font-display" style={{ color: totalPnL > 0 ? '#22c55e' : totalPnL < 0 ? '#ef4444' : 'var(--text-sub)' }}>
                  {formatCurrency(totalPnL)}
                </span>
                <span className="text-[9px] uppercase tracking-wider font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>Total P&L</span>
              </div>
            </div>
          )}
        </div>

        {/* RULES COUNTER */}
        <div 
          className="mt-4 text-xs flex items-center gap-1.5 font-medium w-fit px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}
        >
          <span className="uppercase tracking-wider font-bold text-[9px]" style={{ color: 'var(--text-muted)' }}>Rules:</span>
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>{rulesCount.entry} Entry</span>
          <span style={{ color: 'var(--border-md)' }}>•</span>
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>{rulesCount.exit} Exit</span>
        </div>

        {/* NOTES PREVIEW */}
        {notePreview && (
          <p 
            className="mt-3 text-xs italic font-mono leading-relaxed p-2.5 rounded-xl break-words"
            style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)', color: 'var(--text-sub)' }}
          >
            "{notePreview}"
          </p>
        )}
      </div>

      {/* FOOTER ROW */}
      <div 
        className="mt-5 pt-4 flex items-center justify-between"
        style={{ borderTop: '0.5px solid var(--border)' }}
      >
        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          {imageCount > 0 ? (
            <>
              <ImageIcon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold">{imageCount} reference {imageCount === 1 ? 'image' : 'images'}</span>
            </>
          ) : (
            <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>No layout images</span>
          )}
        </div>
        
        <span className="text-xs font-bold transition-colors flex items-center gap-0.5 cursor-pointer" style={{ color: 'var(--accent)' }}>
          Edit Strategy →
        </span>
      </div>
    </div>
  );
};
