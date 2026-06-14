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
      className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
      onClick={() => navigate(`/strategies/${strategy.id}/edit`)}
    >
      <div>
        {/* TOP ROW */}
        <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center flex-1 min-w-0 pr-2">
            <span className="bg-zinc-950 text-zinc-500 text-xs font-mono rounded-lg px-2.5 py-1 border border-zinc-800 shrink-0">
              #{strategy.sr_no}
            </span>
            <h3 className="text-lg font-bold text-zinc-100 ml-2.5 truncate font-display group-hover:text-white transition-colors" title={strategy.name}>
              {strategy.name}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 relative" ref={menuRef}>
            <StatusBadge status={strategy.status} />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-all cursor-pointer"
              aria-label="Strategy menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-10 min-w-[160px] overflow-hidden">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/strategies/${strategy.id}/edit`);
                  }}
                  className="w-full px-4 py-2.5 text-sm hover:bg-zinc-800 cursor-pointer flex items-center gap-2 text-zinc-300 hover:text-white text-left"
                >
                  <Pencil className="w-4 h-4 text-indigo-400" />
                  <span>Edit Strategy</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onChangeStatusClick(strategy);
                  }}
                  className="w-full px-4 py-2.5 text-sm hover:bg-zinc-800 cursor-pointer flex items-center gap-2 text-zinc-300 hover:text-white text-left"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Change Status</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteClick(strategy);
                  }}
                  className="w-full px-4 py-2.5 text-sm hover:bg-zinc-800 cursor-pointer flex items-center gap-2 text-red-400 hover:text-red-300 text-left border-t border-zinc-800"
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
            <span className="text-sm text-zinc-400 truncate font-medium" title={strategy.sub_type}>
              {strategy.sub_type}
            </span>
          )}
        </div>

        {/* STATS ROW */}
        <div className="mt-5">
          {loadingStats ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-zinc-950/40 rounded-xl p-2.5 h-12 border border-zinc-800/40 animate-pulse" />
              ))}
            </div>
          ) : totalTrades === 0 ? (
            <div className="bg-zinc-950/40 rounded-xl p-3 border border-zinc-800/40 text-center">
              <span className="text-zinc-500 text-xs italic font-medium">No trades logged yet</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {/* TRADES count */}
              <div className="bg-zinc-950/40 rounded-xl p-3 border border-zinc-850 flex flex-col justify-center">
                <span className="text-zinc-100 font-extrabold text-base tracking-tight font-display">{totalTrades}</span>
                <span className="text-zinc-500 text-[9px] uppercase tracking-wider font-bold mt-0.5">Trades</span>
              </div>
              
              {/* WIN RATE */}
              <div className="bg-zinc-950/40 rounded-xl p-3 border border-zinc-850 flex flex-col justify-center">
                <span className={`font-extrabold text-base tracking-tight font-display ${getWinRateColor(winRate)}`}>{winRate}%</span>
                <span className="text-zinc-500 text-[9px] uppercase tracking-wider font-bold mt-0.5">Win Rate</span>
              </div>

              {/* AVG R */}
              <div className="bg-zinc-950/40 rounded-xl p-3 border border-zinc-850 flex flex-col justify-center">
                <span className={`font-extrabold text-base tracking-tight font-display ${getRColor(avgR)}`}>
                  {avgR > 0 ? '+' : ''}{avgR.toFixed(1)}R
                </span>
                <span className="text-zinc-500 text-[9px] uppercase tracking-wider font-bold mt-0.5">Avg R</span>
              </div>

              {/* TOTAL P&L */}
              <div className="bg-zinc-950/40 rounded-xl p-3 border border-zinc-850 flex flex-col justify-center">
                <span className={`font-extrabold text-base tracking-tight font-display ${getPnLColor(totalPnL)}`}>
                  {formatCurrency(totalPnL)}
                </span>
                <span className="text-zinc-500 text-[9px] uppercase tracking-wider font-bold mt-0.5">Total P&L</span>
              </div>
            </div>
          )}
        </div>

        {/* RULES COUNTER */}
        <div className="mt-4 text-xs text-zinc-400 flex items-center gap-1.5 font-medium bg-zinc-950/50 w-fit px-2.5 py-1 rounded-lg border border-zinc-800/40">
          <span className="text-zinc-500 uppercase tracking-wider font-bold text-[9px]">Rules:</span>
          <span className="text-indigo-400 font-semibold">{rulesCount.entry} Entry</span>
          <span className="text-zinc-800">•</span>
          <span className="text-indigo-400 font-semibold">{rulesCount.exit} Exit</span>
        </div>

        {/* NOTES PREVIEW */}
        {notePreview && (
          <p className="mt-3 text-xs text-zinc-500 italic font-mono leading-relaxed bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-800/40 break-words">
            "{notePreview}"
          </p>
        )}
      </div>

      {/* FOOTER ROW */}
      <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-zinc-500">
          {imageCount > 0 ? (
            <>
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400/70" />
              <span className="text-xs font-semibold">{imageCount} reference {imageCount === 1 ? 'image' : 'images'}</span>
            </>
          ) : (
            <span className="text-xs font-normal text-zinc-600">No layout images</span>
          )}
        </div>
        
        <span className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-0.5 cursor-pointer">
          Edit Strategy →
        </span>
      </div>
    </div>
  );
};
