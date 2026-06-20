import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import {
  Menu,
  Target,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
  ChevronRight,
  Plus,
  Filter,
  ChevronLeft,
  SlidersHorizontal
} from 'lucide-react';

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

export const StrategiesPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Primary strategies data
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [missedTrades, setMissedTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // View toggle & storage
  const [viewType, setViewType] = useState<'table' | 'grid'>(() => {
    return (localStorage.getItem('tl-strategies-view') as 'table' | 'grid') || 'table';
  });

  // Current sub-tab active (default: My Strategies)
  const [activeSubTab, setActiveSubTab] = useState<'my' | 'shared'>('my');

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [tempStatusFilter, setTempStatusFilter] = useState<string>('All');
  const [tempTypeFilter, setTempTypeFilter] = useState<string>('All');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Sorting State
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Pagination page state (15 setups per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Action Menu Dropdown State (Per-row/Per-card toggle helper)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Refs for closing dropdowns
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [rulesToDeleteCount, setRulesToDeleteCount] = useState<number>(0);

  // Handle click outside for menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all strategy, trade and rule counts jointly
  const fetchAllData = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [stratRes, tradesRes, rulesRes, missedTradesRes] = await Promise.all([
        supabase
          .from('strategies')
          .select('*')
          .eq('user_id', userId)
          .order('sr_no', { ascending: true }),
        supabase
          .from('trades')
          .select('id, strategy_id, pnl, r_multiple, status')
          .eq('user_id', userId),
        supabase
          .from('strategy_rules')
          .select('id, strategy_id, rule_type')
          .eq('user_id', userId),
        supabase
          .from('missed_trades')
          .select('id, strategy_id')
          .eq('user_id', userId)
      ]);

      if (stratRes.error) throw stratRes.error;
      if (tradesRes.error) throw tradesRes.error;
      if (rulesRes.error) throw rulesRes.error;
      if (missedTradesRes.error) throw missedTradesRes.error;

      setStrategies((stratRes.data as Strategy[]) || []);
      setTrades(tradesRes.data || []);
      setRules(rulesRes.data || []);
      setMissedTrades(missedTradesRes.data || []);
    } catch (err: any) {
      console.error('Error fetching strategies page context:', err);
      showError(err.message || 'Failed to load strategies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [userId]);

  // Sync view selection to storage
  useEffect(() => {
    localStorage.setItem('tl-strategies-view', viewType);
  }, [viewType]);

  // Count rules to show in deletion safety warning
  useEffect(() => {
    if (!selectedStrategy) return;
    const count = rules.filter((r) => r.strategy_id === selectedStrategy.id).length;
    setRulesToDeleteCount(count);
  }, [selectedStrategy, rules]);

  // Set initial state of temp filters when opening dropdown
  useEffect(() => {
    if (filterDropdownOpen) {
      setTempStatusFilter(statusFilter);
      setTempTypeFilter(typeFilter);
    }
  }, [filterDropdownOpen, statusFilter, typeFilter]);

  // Pre-calculate statistics client-side in one pass
  const computedStats = useMemo(() => {
    const statsMap: Record<string, {
      totalTrades: number;
      winRate: number;
      netPnl: number;
      avgR: number;
      profitFactor: string | number;
      expectancy: number;
      missedTrades: number;
      entryRulesCount: number;
      exitRulesCount: number;
    }> = {};

    strategies.forEach((strat) => {
      const stratTrades = trades.filter((t) => t.strategy_id === strat.id);
      const stratRules = rules.filter((r) => r.strategy_id === strat.id);
      const stratMissedTrades = missedTrades.filter((mt) => mt.strategy_id === strat.id);

      const totalTrades = stratTrades.length;
      const wins = stratTrades.filter((t) => t.status === 'Win');
      const losses = stratTrades.filter((t) => t.status === 'Loss');
      const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

      const netPnl = stratTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const sumR = stratTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0);
      const avgR = totalTrades > 0 ? sumR / totalTrades : 0;

      const winPnlSum = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const lossPnlSum = losses.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const absLossPnl = Math.abs(lossPnlSum);
      const profitFactor = absLossPnl > 0 ? (winPnlSum / absLossPnl) : (winPnlSum > 0 ? 'N/A' : 1.00);

      // Expectancy = (winRate/100 * avgWin) + (lossRate/100 * avgLoss)
      const winRateFrac = totalTrades > 0 ? wins.length / totalTrades : 0;
      const lossRateFrac = totalTrades > 0 ? losses.length / totalTrades : 0;
      const avgWin = wins.length > 0 ? winPnlSum / wins.length : 0;
      const avgLoss = losses.length > 0 ? lossPnlSum / losses.length : 0;
      const expectancy = (winRateFrac * avgWin) + (lossRateFrac * avgLoss);

      const entryRulesCount = stratRules.filter((r) => r.rule_type === 'entry').length;
      const exitRulesCount = stratRules.filter((r) => r.rule_type === 'exit').length;

      statsMap[strat.id] = {
        totalTrades,
        winRate,
        netPnl,
        avgR,
        profitFactor,
        expectancy,
        missedTrades: stratMissedTrades.length,
        entryRulesCount,
        exitRulesCount
      };
    });

    return statsMap;
  }, [strategies, trades, rules, missedTrades]);

  // Total active filters count for badge display
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'All') count++;
    if (typeFilter !== 'All') count++;
    return count;
  }, [statusFilter, typeFilter]);

  // Apply filters
  const filteredStrategies = useMemo(() => {
    if (activeSubTab === 'shared') {
      return []; // Shared strategies displays empty
    }
    return strategies.filter((s) => {
      const mappedStatus = s.status === 'active'
        ? 'Active'
        : s.status === 'not_working'
        ? 'Not Working'
        : s.status === 'retired'
        ? 'Retired'
        : s.status;

      const matchStatus = statusFilter === 'All' || mappedStatus === statusFilter;
      const matchType = typeFilter === 'All' || s.type_of_strategy === typeFilter;

      return matchStatus && matchType;
    });
  }, [strategies, statusFilter, typeFilter, activeSubTab]);

  // Sort strategies
  const sortedStrategies = useMemo(() => {
    const result = [...filteredStrategies];
    result.sort((a, b) => {
      let aVal: any = a.name;
      let bVal: any = b.name;

      const statsA = computedStats[a.id];
      const statsB = computedStats[b.id];

      if (sortBy === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortBy === 'trades') {
        aVal = statsA?.totalTrades || 0;
        bVal = statsB?.totalTrades || 0;
      } else if (sortBy === 'pnl') {
        aVal = statsA?.netPnl || 0;
        bVal = statsB?.netPnl || 0;
      } else if (sortBy === 'winrate') {
        aVal = statsA?.winRate || 0;
        bVal = statsB?.winRate || 0;
      } else if (sortBy === 'expectancy') {
        aVal = statsA?.expectancy || 0;
        bVal = statsB?.expectancy || 0;
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
    return result;
  }, [filteredStrategies, sortBy, sortAsc, computedStats]);

  // Paginated strategies calculation
  const paginatedStrategies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedStrategies.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedStrategies, currentPage]);

  const totalPages = Math.ceil(sortedStrategies.length / itemsPerPage) || 1;

  // React Rules of Hooks Guard (Early Returns placed below all React callables)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center animate-pulse" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 border-t-cyan-500 border-zinc-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Modals operations
  const handleOpenStatusModal = (strat: Strategy) => {
    setSelectedStrategy(strat);
    setStatusModalOpen(true);
    setActiveMenuId(null);
  };

  const handleOpenDeleteModal = (strat: Strategy) => {
    setSelectedStrategy(strat);
    setDeleteModalOpen(true);
    setActiveMenuId(null);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedStrategy || !userId) return;
    try {
      const { error } = await supabase
        .from('strategies')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedStrategy.id)
        .eq('user_id', userId);

      if (error) throw error;

      showSuccess(`Strategy status set to '${newStatus.replace('_', ' ')}'`);
      setStrategies((prev) =>
        prev.map((s) => (s.id === selectedStrategy.id ? { ...s, status: newStatus, updated_at: new Date().toISOString() } : s))
      );
      setStatusModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'Failed to update strategy status.');
    }
  };

  const handleDeleteStrategy = async () => {
    if (!selectedStrategy || !userId) return;
    try {
      if (selectedStrategy.reference_images && selectedStrategy.reference_images.length > 0) {
        const paths = selectedStrategy.reference_images
          .map((url) => {
            const splitMatch = url.split('/trade-media/');
            return splitMatch.length > 1 ? splitMatch[1] : null;
          })
          .filter((p): p is string => p !== null);

        if (paths.length > 0) {
          await supabase.storage.from('trade-media').remove(paths);
        }
      }

      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', selectedStrategy.id)
        .eq('user_id', userId);

      if (error) throw error;

      showSuccess('Strategy deleted successfully.');
      setStrategies((prev) => prev.filter((s) => s.id !== selectedStrategy.id));
      setDeleteModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'Error occurred while deleting strategy.');
    }
  };

  const applyFilters = () => {
    setStatusFilter(tempStatusFilter);
    setTypeFilter(tempTypeFilter);
    setCurrentPage(1);
    setFilterDropdownOpen(false);
  };

  // Currency general representation helper
  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(absVal);
    return `${isNegative ? '-' : ''}₹${formatted}`;
  };

  const getStatusBadgeMinimal = (statusStr: string) => {
    const clean = statusStr === 'active' ? 'Active' : statusStr === 'not_working' ? 'Not Working' : statusStr === 'retired' ? 'Retired' : statusStr;
    switch (clean) {
      case 'Active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
            Active
          </span>
        );
      case 'Not Working':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-550/10 text-amber-400">
            Not Working
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">
            Retired
          </span>
        );
    }
  };

  const getTypeSquare = (typeOfStrat: string) => {
    switch (typeOfStrat) {
      case 'Breakout':
        return <div className="w-1 h-4 rounded-sm bg-emerald-500 shrink-0" />;
      case 'Reversal':
        return <div className="w-1 h-4 rounded-sm bg-cyan-500 shrink-0" />;
      default:
        return <div className="w-1 h-4 rounded-sm bg-amber-500 shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT MAIN BOX */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
        {/* MOBILE HEADER */}
        <header
          className="flex items-center justify-between px-6 py-4 md:hidden sticky top-0 z-20"
          style={{ backgroundColor: 'var(--topbar)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="text-xl font-bold tracking-wider font-display" style={{ color: 'var(--accent)' }}>TRADELYZE</div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg cursor-pointer text-zinc-400 hover:text-white"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            
            {/* NEW PAGE HEADER ROW */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-2">
              {/* LEFT SIDE TABS */}
              <div className="flex items-center border-b border-zinc-800 sm:border-0 w-fit">
                <button
                  onClick={() => {
                    setActiveSubTab('my');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2.5 font-semibold text-[15px] font-display transition-all cursor-pointer border-b-2 relative -bottom-[2px] ${
                    activeSubTab === 'my'
                      ? 'border-cyan-500 text-white font-bold'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  My Strategies
                </button>
                <button
                  onClick={() => {
                    showSuccess('Coming soon — Shared setup Playbook will be added in a future update.');
                  }}
                  className={`px-4 py-2.5 font-semibold text-[15px] font-display transition-all cursor-pointer border-b-2 relative -bottom-[2px] ${
                    activeSubTab === 'shared'
                      ? 'border-cyan-500 text-white font-bold'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Shared Strategies
                </button>
              </div>

              {/* RIGHT SIDE ACTIONS */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* FILTERS BUTTON & DROPDOWN */}
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                    style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bar)' }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="bg-cyan-500 text-slate-900 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {filterDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-72 shadow-xl z-40 p-4 animate-fade-in"
                      style={{
                        backgroundColor: 'var(--card)',
                        border: '0.5px solid var(--border)',
                        color: 'var(--text)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                        borderRadius: '10px'
                      }}
                    >
                      <h4 className="text-[11px] font-bold uppercase tracking-wider font-mono mb-3 block" style={{ color: 'var(--text-muted)' }}>Filter Setups</h4>
                      
                      {/* STATUS SECTION */}
                      <div className="mb-4">
                        <span className="text-[10px] font-semibold block mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>STATUS</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {['All', 'Active', 'Not Working', 'Retired'].map((st) => {
                            const isSelected = tempStatusFilter === st;
                            return (
                              <button
                                key={st}
                                onClick={() => setTempStatusFilter(st)}
                                className="px-2 py-1 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer"
                                style={
                                  isSelected
                                    ? {
                                        backgroundColor: 'var(--accent-muted)',
                                        color: 'var(--accent)',
                                        border: '1px solid var(--accent)'
                                      }
                                    : {
                                        backgroundColor: 'var(--bar)',
                                        color: 'var(--text-sub)',
                                        border: '0.5px solid var(--border)'
                                      }
                                }
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* TYPE SECTION */}
                      <div className="mb-4">
                        <span className="text-[10px] font-semibold block mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>TYPE</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {['All', 'Breakout', 'Reversal', 'Neutral'].map((ty) => {
                            const isSelected = tempTypeFilter === ty;
                            return (
                              <button
                                key={ty}
                                onClick={() => setTempTypeFilter(ty)}
                                className="px-2 py-1 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer"
                                style={
                                  isSelected
                                    ? {
                                        backgroundColor: 'var(--accent-muted)',
                                        color: 'var(--accent)',
                                        border: '1px solid var(--accent)'
                                      }
                                    : {
                                        backgroundColor: 'var(--bar)',
                                        color: 'var(--text-sub)',
                                        border: '0.5px solid var(--border)'
                                      }
                                }
                              >
                                {ty}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ACTIONS ROW */}
                      <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        <button
                          onClick={() => {
                            setTempStatusFilter('All');
                            setTempTypeFilter('All');
                          }}
                          className="flex-1 py-1.5 text-center text-xs font-semibold rounded-lg border cursor-pointer transition-all"
                          style={{
                            color: 'var(--text-sub)',
                            borderColor: 'var(--border)',
                            backgroundColor: 'transparent'
                          }}
                        >
                          Clear
                        </button>
                        <button
                          onClick={applyFilters}
                          className="flex-1 py-1.5 font-bold text-xs rounded-lg transition-all cursor-pointer"
                          style={{
                            backgroundColor: 'var(--accent)',
                            color: 'var(--bg)'
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* LIST / GRID TOGGLER */}
                <div className="flex items-center border rounded-xl overflow-hidden p-0.5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bar)' }}>
                  <button
                    onClick={() => setViewType('table')}
                    className={`py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors ${
                      viewType === 'table' ? 'bg-[#1E1F29] text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="List Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewType('grid')}
                    className={`py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors ${
                      viewType === 'grid' ? 'bg-[#1E1F29] text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Grid Minimal View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* ADD NEW STRATEGY */}
                <Link
                  to="/strategies/new"
                  className="px-4 py-1.5 bg-cyan-600 font-semibold text-white rounded-xl text-xs hover:bg-cyan-500 shadow-md inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Strategy</span>
                </Link>
              </div>
            </div>

            {/* ERROR / LOADER BOX */}
            {loading ? (
              <div className="flex flex-col gap-3 py-16 items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-t-cyan-500 border-zinc-700 animate-spin"></div>
                <p className="text-xs text-zinc-500 font-mono">Aggregating playbook statistics...</p>
              </div>
            ) : sortedStrategies.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center justify-center">
                <div className="bg-zinc-800/20 w-12 h-12 rounded-xl flex items-center justify-center border border-zinc-800 mb-4">
                  <Target className="w-6 h-6 text-zinc-500" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-1">No strategies yet</h3>
                <p className="text-xs text-zinc-500 max-w-xs mb-4">
                  No setups match current filters or you haven't created your first setup yet. Learn from your edge.
                </p>
                <Link
                  to="/strategies/new"
                  className="px-3.5 py-1.5 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-450 border border-cyan-500/20 font-semibold text-xs rounded-lg transition-transform"
                >
                  + Add New Strategy
                </Link>
              </div>
            ) : viewType === 'table' ? (
              /* CLEAN TRADEZELLA-STYLE TABLE VIEW */
              <div className="w-full overflow-x-auto select-none mt-2">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-900/50 border-b border-zinc-800" style={{ backgroundColor: 'var(--bar)' }}>
                      <th className="py-3 px-4 min-w-[240px] font-sans font-bold text-zinc-400">Strategy Name</th>
                      <th className="py-3 px-4 text-center font-sans font-bold text-zinc-400">Trades</th>
                      <th className="py-3 px-4 text-center font-sans font-bold text-zinc-400">Net P&L</th>
                      <th className="py-3 px-4 text-center font-sans font-bold text-zinc-400">Win Rate</th>
                      <th className="py-3 px-4 text-center font-sans font-bold text-zinc-400">Avg R</th>
                      <th className="py-3 px-4 text-center font-sans font-bold text-zinc-400">Profit Factor</th>
                      <th className="py-3 px-4 text-center font-sans font-bold text-zinc-400">Expectancy</th>
                      <th className="py-3 px-4 text-center font-sans font-bold text-zinc-400">Missed Trades</th>
                      <th className="py-3 px-4 text-center font-sans font-bold text-zinc-400">Status</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStrategies.map((strat) => {
                      const stats = computedStats[strat.id] || {
                        totalTrades: 0,
                        winRate: 0,
                        netPnl: 0,
                        avgR: 0,
                        profitFactor: 1.00,
                        expectancy: 0,
                        missedTrades: 0
                      };

                      const isPnlPositive = stats.netPnl >= 0;
                      const isExpectancyPositive = stats.expectancy >= 0;

                      let winRateColor = 'text-red-400';
                      if (stats.winRate >= 60) winRateColor = 'text-emerald-400';
                      else if (stats.winRate >= 40) winRateColor = 'text-amber-400';

                      const isMenuOpen = activeMenuId === strat.id;

                      return (
                        <tr
                          key={strat.id}
                          className="border-b transition-colors cursor-pointer h-[52px]"
                          style={{ borderColor: 'var(--border)' }}
                          onClick={() => navigate(`/strategies/${strat.id}`)}
                        >
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-3">
                              {getTypeSquare(strat.type_of_strategy)}
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-200 text-sm hover:text-cyan-400 transition-colors">{strat.name}</span>
                                <span className="text-[10px] text-zinc-500 font-medium">· {strat.type_of_strategy || 'Neutral'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center text-xs font-mono font-medium text-zinc-300">{stats.totalTrades}</td>
                          <td className={`py-2.5 px-4 text-center text-xs font-mono font-bold ${isPnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(stats.netPnl)}
                          </td>
                          <td className={`py-2.5 px-4 text-center text-xs font-mono font-bold ${winRateColor}`}>{stats.winRate.toFixed(1)}%</td>
                          <td className={`py-2.5 px-4 text-center text-xs font-mono ${stats.avgR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stats.avgR >= 0 ? '+' : ''}{stats.avgR.toFixed(2)}R
                          </td>
                          <td className="py-2.5 px-4 text-center text-xs font-mono font-semibold text-zinc-300">
                            {typeof stats.profitFactor === 'number' ? stats.profitFactor.toFixed(2) : stats.profitFactor}
                          </td>
                          <td className={`py-2.5 px-4 text-center text-xs font-mono font-semibold ${isExpectancyPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(stats.expectancy)}
                          </td>
                          <td className="py-2.5 px-4 text-center text-xs font-mono text-zinc-500">0</td>
                          <td className="py-2.5 px-4 text-center">{getStatusBadgeMinimal(strat.status)}</td>
                          <td className="py-2.5 px-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                if (isMenuOpen) {
                                  setActiveMenuId(null);
                                } else {
                                  setActiveMenuId(strat.id);
                                }
                              }}
                              className="p-1 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div
                                ref={dropdownRef}
                                className="absolute right-4 mt-1 w-40 shadow-xl z-30 p-1"
                                style={{
                                  backgroundColor: 'var(--card)',
                                  border: '0.5px solid var(--border)',
                                  color: 'var(--text)',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                                  borderRadius: '10px'
                                }}
                              >
                                <button
                                  onClick={() => navigate(`/strategies/${strat.id}`)}
                                  className="w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors text-[var(--text)] hover:bg-[var(--row)] hover:text-[var(--text)]"
                                >
                                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                  View Detail
                                </button>
                                <button
                                  onClick={() => navigate(`/strategies/${strat.id}/edit`)}
                                  className="w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors text-[var(--text)] hover:bg-[var(--row)] hover:text-[var(--text)]"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                  Edit Setup
                                </button>
                                <button
                                  onClick={() => handleOpenStatusModal(strat)}
                                  className="w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors text-[var(--text)] hover:bg-[var(--row)] hover:text-[var(--text)]"
                                >
                                  <Target className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                  Set Status
                                </button>
                                <hr className="my-1" style={{ borderColor: 'var(--border)', opacity: 0.2 }} />
                                <button
                                  onClick={() => handleOpenDeleteModal(strat)}
                                  className="w-full text-left px-3 py-1.5 text-xs font-bold text-red-500 rounded-lg flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--row)] hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  Delete Setup
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* PAGINATION ROW CONTROLLER */}
                <div className="flex items-center justify-between border-t border-zinc-800 py-4 px-1 mt-2">
                  <span className="text-zinc-500 text-xs font-mono">
                    Result: {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedStrategies.length)} of {sortedStrategies.length} strategies
                  </span>

                  {totalPages > 1 && (
                    <div className="flex gap-2">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="px-3 py-1 text-xs font-bold uppercase rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors inline-flex items-center gap-1 text-zinc-300"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                      </button>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className="px-3 py-1 text-xs font-bold uppercase rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors inline-flex items-center gap-1 text-zinc-300"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* GRID MINIMAL VIEW (JUST NAME, TYP, STATUS, NO STATS) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                {paginatedStrategies.map((strat) => {
                  const isMenuOpen = activeMenuId === strat.id;

                  return (
                    <div
                      key={strat.id}
                      onClick={() => navigate(`/strategies/${strat.id}`)}
                      className="rounded-xl p-4 flex flex-col cursor-pointer border transition-all duration-[120ms] hover:border-zinc-700"
                      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '10px' }}
                    >
                      {/* TOP ROW */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getTypeSquare(strat.type_of_strategy)}
                          <h3 className="font-semibold text-zinc-200 text-sm tracking-tight leading-snug line-clamp-1">{strat.name}</h3>
                        </div>
                        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              if (isMenuOpen) {
                                setActiveMenuId(null);
                              } else {
                                setActiveMenuId(strat.id);
                              }
                            }}
                            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-850 transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div
                              ref={dropdownRef}
                              className="absolute right-0 mt-1 w-36 shadow-xl z-30 p-1"
                              style={{
                                backgroundColor: 'var(--card)',
                                border: '0.5px solid var(--border)',
                                color: 'var(--text)',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                                borderRadius: '10px'
                              }}
                            >
                              <button
                                onClick={() => navigate(`/strategies/${strat.id}`)}
                                className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors text-[var(--text)] hover:bg-[var(--row)] hover:text-[var(--text)]"
                              >
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                View Detail
                              </button>
                              <button
                                onClick={() => navigate(`/strategies/${strat.id}/edit`)}
                                className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors text-[var(--text)] hover:bg-[var(--row)] hover:text-[var(--text)]"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                Edit Setup
                              </button>
                              <button
                                onClick={() => handleOpenStatusModal(strat)}
                                className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors text-[var(--text)] hover:bg-[var(--row)] hover:text-[var(--text)]"
                              >
                                <Target className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                Set Status
                              </button>
                              <hr className="my-1" style={{ borderColor: 'var(--border)', opacity: 0.2 }} />
                              <button
                                onClick={() => handleOpenDeleteModal(strat)}
                                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-red-500 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors hover:bg-[var(--row)] hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                Delete Setup
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SECOND ROW */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-zinc-500 font-mono font-semibold">{strat.type_of_strategy || 'Neutral'}</span>
                        <span className="text-[10px] text-zinc-650 font-mono font-bold">·</span>
                        {getStatusBadgeMinimal(strat.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* CHANGE STATUS MODAL */}
      {selectedStrategy && (
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title="Change Status"
        >
          <div className="space-y-4 pt-1">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block font-mono">
              Strategy: <strong className="text-white">{selectedStrategy.name}</strong>
            </span>

            <div className="space-y-2.5">
              <button
                onClick={() => handleStatusChange('active')}
                className={`w-full text-left py-3 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  selectedStrategy.status === 'active'
                    ? 'bg-emerald-950/40 border-emerald-600 text-emerald-400'
                    : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Set Active</span>
                </span>
                {selectedStrategy.status === 'active' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                onClick={() => handleStatusChange('not_working')}
                className={`w-full text-left py-3 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  selectedStrategy.status === 'not_working'
                    ? 'bg-amber-950/40 border-amber-600 text-amber-400'
                    : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-amber-450 font-bold">⚠</span>
                  <span>Set Not Working Well</span>
                </span>
                {selectedStrategy.status === 'not_working' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                onClick={() => handleStatusChange('retired')}
                className={`w-full text-left py-3 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  selectedStrategy.status === 'retired'
                    ? 'bg-zinc-950 border-zinc-700 text-zinc-400'
                    : 'border-zinc-800 text-zinc-500 hover:bg-zinc-850'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-zinc-500 font-bold">—</span>
                  <span>Set Retired</span>
                </span>
                {selectedStrategy.status === 'retired' && <CheckCircle2 className="w-4 h-4 text-zinc-400" />}
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setStatusModalOpen(false)}
                className="bg-transparent hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg px-4 py-2 text-sm transition-all cursor-pointer font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {selectedStrategy && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Strategy?"
        >
          <div className="text-center pt-2">
            <div className="bg-red-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>

            <p className="text-zinc-100 text-base font-semibold">
              Are you sure you want to delete this?
            </p>

            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
              You are about to delete <strong className="text-white font-semibold">"{selectedStrategy.name}"</strong>.
              This will permanently remove the strategy and all {rulesToDeleteCount || 'its'} entry/exit rules.
              Your trade logs using this setup will <strong className="text-indigo-400 font-semibold">NOT</strong> be deleted.
            </p>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 bg-transparent hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg px-4 py-2 font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStrategy}
                className="flex-1 bg-red-650 hover:bg-red-650 text-white rounded-lg px-4 py-2 font-semibold transition-all cursor-pointer shadow-md shadow-red-950/20"
              >
                Delete Setup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
