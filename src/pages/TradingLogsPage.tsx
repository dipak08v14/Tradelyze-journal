import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import {
  Menu,
  Plus,
  Star,
  BarChart,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  X,
  TrendingUp,
  Settings2
} from 'lucide-react';
import { Trade } from '../types';

export const TradingLogsPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter Needs Review State
  const [filterNeedsReview, setFilterNeedsReview] = useState<boolean>(false);

  // Bulk Trade Review States
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [strategiesList, setStrategiesList] = useState<{ id: string; name: string }[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const [isTableHovered, setIsTableHovered] = useState<boolean>(false);

  // Fetch Strategies for bulk assign list
  const fetchStrategiesList = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('id, name')
        .eq('user_id', userId)
        .order('name');
      if (error) throw error;
      setStrategiesList(data || []);
    } catch (err) {
      console.error('Error fetching strategies for bulk layout:', err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchStrategiesList();
    }
  }, [userId]);

  // Bulk Apply Setup Logic
  const handleBulkApplySetup = async () => {
    // 1. Validate: if no trades selected or no setup chosen, show error toast and return early.
    if (!selectedTradeIds || selectedTradeIds.length === 0) {
      showError("No trades selected");
      return;
    }
    if (!selectedStrategyId) {
      showError("Please select a setup first");
      return;
    }

    try {
      // 2. Set button to loading: disable button, change text to "Applying..."
      setBulkLoading(true);

      const strategyObj = strategiesList.find(s => s.id === selectedStrategyId);
      const strategyName = strategyObj ? strategyObj.name : 'selected setup';

      // 3. Single Supabase update that sets BOTH fields at the same time:
      const { error } = await supabase
        .from('trades')
        .update({
          strategy_id: selectedStrategyId,
          needs_review: false
        })
        .in('id', selectedTradeIds);

      // 4. If error: show error toast with error.message, reset button, return.
      if (error) {
        console.error('Bulk update error:', error);
        showError("Failed to update trades: " + error.message);
        return;
      }

      // 5. If success — do ALL of these immediately, in this order:
      // a. Show success toast: "X trades assigned to [strategy name] and marked as reviewed"
      showSuccess(selectedTradeIds.length + " trades assigned to " + strategyName + " and marked as reviewed");
      
      // b. Clear selectedTradeIds state to empty array
      setSelectedTradeIds([]);
      
      // c. Reset strategy dropdown selection back to default
      setSelectedStrategyId('');
      
      // d. Re-fetch the full trades list from Supabase and update the table state
      await fetchTradesData();
    } catch (err: any) {
      console.error('Bulk update error:', err);
      showError("Failed to update trades: " + (err.message || err));
    } finally {
      // 6. Always reset button in finally block
      setBulkLoading(false);
    }
  };

  // Keyboard shortcut to clear selection on Escape press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedTradeIds.length > 0) {
        setSelectedTradeIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTradeIds]);

  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'needs_review') {
      setFilterNeedsReview(true);
    }
  }, [searchParams]);

  // General App & Navigation
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // States for Filter Parameters
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterSymbol, setFilterSymbol] = useState<string>('');
  const [filterSetup, setFilterSetup] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All'); // 'All' | 'Win' | 'Loss' | 'Breakeven'
  const [filterExecution, setFilterExecution] = useState<string>('All');
  const [filterMistakeType, setFilterMistakeType] = useState<string>('All');

  // Sorting State
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination, Columns Config, and Aggregated Stats States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [tradesPerPage, setTradesPerPage] = useState<number>(50);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState<boolean>(false);
  const [tempSelectedColumns, setTempSelectedColumns] = useState<Record<string, boolean>>({});

  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('tl-log-columns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Safe fallback
      }
    }
    return {
      date: true,
      symbol: true,
      direction: true,
      option_type: true,
      strategies: true,
      pnl: true,
      r_multiple: true,
      status: true,
      execution_status: true,
      holding_time_mins: true,
      mistake_type: false,
      roi: false,
      notes: false,
      month: false,
      needs_review: false,
      sync_source: false
    };
  });

  const [calculatedStats, setCalculatedStats] = useState({
    totalCount: 0,
    totalPnl: 0,
    profitFactor: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    avgR: 0,
    winCount: 0,
    lossCount: 0,
    breakEvenCount: 0
  });

  const [filterOptions, setFilterOptions] = useState<{ years: number[]; setups: string[] }>({
    years: [],
    setups: []
  });

  const ALL_COLUMNS_INFO = [
    { id: 'date', label: 'Date' },
    { id: 'symbol', label: 'Symbol' },
    { id: 'direction', label: 'Direction' },
    { id: 'option_type', label: 'Option Type' },
    { id: 'strategies', label: 'Setup' },
    { id: 'pnl', label: 'Net P&L' },
    { id: 'r_multiple', label: 'R-Multiple' },
    { id: 'status', label: 'Status' },
    { id: 'execution_status', label: 'Execution' },
    { id: 'holding_time_mins', label: 'Hold Time' },
    { id: 'mistake_type', label: 'Mistake' },
    { id: 'roi', label: 'ROI' },
    { id: 'notes', label: 'Notes' },
    { id: 'month', label: 'Month' },
    { id: 'needs_review', label: 'Needs Review' },
    { id: 'sync_source', label: 'Sync Source' },
  ];

  // Load Session Safety
  useEffect(() => {
    if (!authLoading && !userId) {
      navigate('/login');
    }
  }, [userId, authLoading, navigate]);

  // Fetch unique years and setups directly for filters list across whole DB
  const fetchFilterOptions = async () => {
    if (!userId) return;
    try {
      const { data: strategiesData } = await supabase
        .from('strategies')
        .select('name')
        .eq('user_id', userId);
        
      const setupsSet = new Set<string>();
      strategiesData?.forEach(s => {
        if (s.name) setupsSet.add(s.name);
      });

      const { data: tradesData } = await supabase
        .from('trades')
        .select('year')
        .eq('user_id', userId);

      const yearsSet = new Set<number>();
      tradesData?.forEach(t => {
        if (t.year) yearsSet.add(t.year);
      });

      setFilterOptions({
        setups: Array.from(setupsSet).sort(),
        years: Array.from(yearsSet).sort((a, b) => b - a)
      });
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchFilterOptions();
    }
  }, [userId]);

  // Apply filters helper to standard query
  const applyFiltersToQuery = (query: any) => {
    if (filterMonth !== 'All') {
      query = query.eq('month', filterMonth);
    }
    if (filterYear !== 'All') {
      query = query.eq('year', parseInt(filterYear, 10));
    }
    if (filterSymbol.trim() !== '') {
      query = query.ilike('symbol', `%${filterSymbol.trim()}%`);
    }
    if (filterSetup !== 'All') {
      query = query.eq('strategies.name', filterSetup);
    }
    if (filterStatus !== 'All') {
      query = query.eq('status', filterStatus);
    }
    if (filterExecution !== 'All') {
      query = query.eq('execution_status', filterExecution);
    }
    if (filterMistakeType !== 'All') {
      query = query.eq('mistake_type', filterMistakeType);
    }
    if (filterNeedsReview) {
      query = query.eq('needs_review', true);
    }
    return query;
  };

  // Fetch Trades with pagination, sorting, and aggregations directly in Supabase
  const fetchTradesData = async () => {
    if (!userId) return;
    try {
      setLoading(true);

      // --- 1. COUNT & STATS AGGREGATION QUERY ---
      let statsQuery = supabase.from('trades').select(
        filterSetup !== 'All' 
          ? 'pnl, status, r_multiple, strategies!inner(name)' 
          : 'pnl, status, r_multiple'
      ).eq('user_id', userId);

      statsQuery = applyFiltersToQuery(statsQuery);

      const { data: statsData, error: statsError } = await statsQuery as any;
      if (statsError) throw statsError;

      const totalCount = statsData ? statsData.length : 0;

      let totalPnl = 0;
      let winningPnlSum = 0;
      let losingPnlSum = 0;
      let winCount = 0;
      let winTradesCount = 0;
      let lossTradesCount = 0;
      let winTradesPnlSum = 0;
      let lossTradesPnlSum = 0;
      let rSum = 0;
      let rCount = 0;
      let breakEvenCount = 0;

      statsData?.forEach((t) => {
        const p = t.pnl ? parseFloat(t.pnl as any) : 0;
        totalPnl += p;
        if (t.status === 'Win') {
          winCount++;
          winTradesCount++;
          winTradesPnlSum += p;
          winningPnlSum += p;
        } else if (t.status === 'Loss') {
          lossTradesCount++;
          lossTradesPnlSum += p;
          losingPnlSum += Math.abs(p);
        } else if (t.status === 'Breakeven' || t.status === 'Break Even') {
          breakEvenCount++;
        }

        if (t.r_multiple !== null && t.r_multiple !== undefined) {
          rSum += parseFloat(t.r_multiple as any);
          rCount++;
        }
      });

      const profitFactor = losingPnlSum > 0 ? winningPnlSum / losingPnlSum : losingPnlSum === 0 && winningPnlSum > 0 ? Infinity : 0;
      const winRate = totalCount > 0 ? (winCount / totalCount) * 100 : 0;
      const avgWin = winTradesCount > 0 ? winTradesPnlSum / winTradesCount : 0;
      const avgLoss = lossTradesCount > 0 ? lossTradesPnlSum / lossTradesCount : 0;
      const avgR = rCount > 0 ? rSum / rCount : 0;

      setCalculatedStats({
        totalCount,
        totalPnl,
        profitFactor,
        winRate,
        avgWin,
        avgLoss,
        avgR,
        winCount,
        lossCount: lossTradesCount,
        breakEvenCount
      });

      // --- 2. PAGINATED MAIN DATA QUERY ---
      const fromIndex = (currentPage - 1) * tradesPerPage;
      const toIndex = fromIndex + tradesPerPage - 1;

      let dataQuery = supabase.from('trades').select(
        filterSetup !== 'All' 
          ? '*, strategies!inner(name, type_of_strategy)' 
          : '*, strategies(name, type_of_strategy)'
      ).eq('user_id', userId);

      dataQuery = applyFiltersToQuery(dataQuery);

      // Sorting
      if (sortColumn === 'strategies.name') {
        dataQuery = dataQuery.order('name', { foreignTable: 'strategies', ascending: sortDirection === 'asc' });
        dataQuery = dataQuery.order('date', { ascending: false });
      } else {
        dataQuery = dataQuery.order(sortColumn, { ascending: sortDirection === 'asc' });
      }

      dataQuery = dataQuery.range(fromIndex, toIndex);

      const { data: pageData, error: dataError } = await dataQuery;
      if (dataError) throw dataError;

      setAllTrades(pageData as Trade[]);
    } catch (err: any) {
      console.error('Error loading trades history:', err);
      showError(err.message || 'Failed to sync your trades list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTradesData();
  }, [
    userId,
    filterMonth,
    filterYear,
    filterSymbol,
    filterSetup,
    filterStatus,
    filterExecution,
    filterMistakeType,
    filterNeedsReview,
    currentPage,
    tradesPerPage,
    sortColumn,
    sortDirection
  ]);

  // Reset to page 1 on filter or limit adjustments
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterMonth,
    filterYear,
    filterSymbol,
    filterSetup,
    filterStatus,
    filterExecution,
    filterMistakeType,
    filterNeedsReview,
    tradesPerPage
  ]);

  // Map to local variables for filter and layout compatibility
  const uniqueYears = filterOptions.years;
  const uniqueSetups = filterOptions.setups;

  // Filter Active Check
  const isFilterActive = useMemo(() => {
    return (
      filterMonth !== 'All' ||
      filterYear !== 'All' ||
      filterSymbol !== '' ||
      filterSetup !== 'All' ||
      filterStatus !== 'All' ||
      filterExecution !== 'All' ||
      filterMistakeType !== 'All' ||
      filterNeedsReview
    );
  }, [
    filterMonth,
    filterYear,
    filterSymbol,
    filterSetup,
    filterStatus,
    filterExecution,
    filterMistakeType,
    filterNeedsReview
  ]);

  // Reset Filters Function
  const handleResetFilters = () => {
    setFilterMonth('All');
    setFilterYear('All');
    setFilterSymbol('');
    setFilterSetup('All');
    setFilterStatus('All');
    setFilterExecution('All');
    setFilterMistakeType('All');
    setFilterNeedsReview(false);
    setSearchParams({});
    setCurrentPage(1);
  };

  // Perform filtering / sorting adaptation layers
  const filteredTrades = allTrades;
  const sortedTrades = allTrades;

  const stats = {
    count: calculatedStats.totalCount,
    totalPnl: calculatedStats.totalPnl,
    winRate: calculatedStats.winRate,
    avgR: calculatedStats.avgR,
    profitFactor: calculatedStats.profitFactor
  };

  // Handle Sort Toggle
  const toggleSort = (colName: string) => {
    if (sortColumn === colName) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  // Indian Rupees Currency Formatter style
  const formatINR = (val: number) => {
    const prefix = val < 0 ? '-₹' : '₹';
    return `${prefix}${Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Indian Rupees Currency Formatter style for summary stats (no decimals: ₹X,XXX)
  const formatINRStat = (val: number) => {
    const prefix = val < 0 ? '-₹' : '₹';
    return `${prefix}${Math.round(Math.abs(val)).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Date Tag Helper (Today, Yesterday)
  const getDateDisplay = (dateStr: string) => {
    if (!dateStr) return { label: '—', isHighlight: false };
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (dateStr === today) {
        return { label: 'Today', isHighlight: true };
      }
      if (dateStr === yesterday) {
        return { label: 'Yesterday', isHighlight: false };
      }

      const d = new Date(dateStr);
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      return { label: `${day} ${month}`, isHighlight: false };
    } catch {
      return { label: dateStr, isHighlight: false };
    }
  };

  // Render score helpers
  const getWinRateColor = (wr: number) => {
    if (wr >= 60) return 'text-green-400';
    if (wr >= 45) return 'text-amber-400';
    return 'text-red-400';
  };

  const getAvgRColor = (r: number) => {
    if (r >= 1.5) return 'text-green-400';
    if (r > 0) return 'text-amber-400';
    return 'text-red-400';
  };

  const getProfitFactorColor = (pf: number) => {
    if (pf === Infinity || pf > 1.5) return '#22c55e';
    if (pf > 1) return '#f59e0b';
    return '#ef4444';
  };

  // Centralized Column Definitions for Conditionals and Sorting
  const colDefinitions: Record<string, {
    label: string;
    sortField: string;
    renderCell: (item: Trade) => React.ReactNode;
  }> = {
    date: {
      label: 'Date',
      sortField: 'date',
      renderCell: (item) => {
        const dateTagStr = getDateDisplay(item.date);
        return (
          <span className="font-mono text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--text-sub)' }}>
            {dateTagStr.label === 'Today' || dateTagStr.label === 'Yesterday' ? (
              <span
                style={{
                  backgroundColor: 'var(--accent-muted)',
                  color: 'var(--accent)',
                  border: '0.5px solid var(--accent)',
                  borderRadius: '999px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                }}
                className="uppercase font-sans font-bold"
              >
                {dateTagStr.label}
              </span>
            ) : (
              <span>{dateTagStr.label}</span>
            )}
          </span>
        );
      }
    },
    symbol: {
      label: 'Symbol',
      sortField: 'symbol',
      renderCell: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-mono tracking-wide" style={{ color: 'var(--text)', fontWeight: 600 }}>
            {item.symbol}
          </span>
          {item.needs_review && (
            <span 
              style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316', border: '0.5px solid #f97316' }}
              className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded tracking-wider whitespace-nowrap"
            >
              Needs Review
            </span>
          )}
        </div>
      )
    },
    direction: {
      label: 'Direction',
      sortField: 'direction',
      renderCell: (item) => item.direction ? (
        <span
          style={{
            backgroundColor: item.direction === 'LONG' ? '#dcfce7' : '#fee2e2',
            color: item.direction === 'LONG' ? '#16a34a' : '#dc2626',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 700,
          }}
          className="inline-block"
        >
          {item.direction}
        </span>
      ) : (
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
      )
    },
    option_type: {
      label: 'Option Type',
      sortField: 'option_type',
      renderCell: (item) => {
        if (!item.option_type) return <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>;
        const isCallOrPut = item.option_type === 'CALL' || item.option_type === 'PUT';
        return (
          <span
            style={isCallOrPut ? {
              backgroundColor: '#1e293b',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 700,
            } : {
              backgroundColor: 'var(--row)',
              color: 'var(--text)',
              border: '0.5px solid var(--border)',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 600,
            }}
            className="inline-block font-sans"
          >
            {item.option_type}
          </span>
        );
      }
    },
    strategies: {
      label: 'Setup',
      sortField: 'strategies.name',
      renderCell: (item) => item.strategies?.name ? (
        <span className="font-semibold font-mono text-xs" style={{ color: 'var(--text-sub)' }}>
          {item.strategies.name}
        </span>
      ) : (
        <span className="italic font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
          No Setup
        </span>
      )
    },
    pnl: {
      label: 'Net P&L',
      sortField: 'pnl',
      renderCell: (item) => {
        const hasProfit = item.pnl !== null && item.pnl > 0;
        const hasLoss = item.pnl !== null && item.pnl < 0;
        return (
          <span
            style={{
              color: hasProfit ? '#22c55e' : hasLoss ? '#ef4444' : 'var(--text-muted)',
              fontWeight: 600
            }}
            className="font-mono text-sm"
          >
            {item.pnl !== null ? formatINR(item.pnl) : '—'}
          </span>
         );
      }
    },
    r_multiple: {
      label: 'R-Multiple',
      sortField: 'r_multiple',
      renderCell: (item) => item.r_multiple !== null ? (
        <span
          className={`font-mono font-bold text-xs ${
            item.r_multiple > 0 ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {item.r_multiple > 0 ? '+' : ''}
          {item.r_multiple.toFixed(2)}R
        </span>
      ) : (
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
      )
    },
    status: {
      label: 'Status',
      sortField: 'status',
      renderCell: (item) => (
        <>
          {item.status === 'Win' && (
            <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '11px', fontWeight: 700, padding: '2px 8px' }} className="inline-block">
              WIN
            </span>
          )}
          {item.status === 'Loss' && (
            <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '11px', fontWeight: 700, padding: '2px 8px' }} className="inline-block">
              LOSS
            </span>
          )}
          {item.status === 'Breakeven' && (
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-zinc-150 border border-zinc-200 text-zinc-650 rounded-lg">
              BE
            </span>
          )}
          {item.status === null && (
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
          )}
        </>
      )
    },
    execution_status: {
      label: 'Execution',
      sortField: 'execution_status',
      renderCell: (item) => item.execution_status ? (
        <span
          style={{
            backgroundColor:
              item.execution_status === 'BEST TRADE'
                ? 'rgba(34,197,94,0.12)'
                : item.execution_status === 'GOOD TRADE'
                ? 'rgba(20,184,166,0.12)'
                : item.execution_status === 'AVERAGE TRADE'
                ? 'rgba(234,179,8,0.12)'
                : item.execution_status === 'POOR TRADE'
                ? 'rgba(249,115,22,0.12)'
                : 'rgba(239,68,68,0.12)',
            color:
              item.execution_status === 'BEST TRADE'
                ? '#22c55e'
                : item.execution_status === 'GOOD TRADE'
                ? '#14b8a6'
                : item.execution_status === 'AVERAGE TRADE'
                ? '#ca8a04'
                : item.execution_status === 'POOR TRADE'
                ? '#f97316'
                : '#ef4444',
          }}
          className="px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wide font-extrabold rounded-md"
        >
          {item.execution_status}
        </span>
      ) : (
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
      )
    },
    holding_time_mins: {
      label: 'Hold Time',
      sortField: 'holding_time_mins',
      renderCell: (item) => item.holding_time_mins !== null && item.holding_time_mins !== undefined ? (
        <span className="font-mono text-xs" style={{ color: 'var(--text-sub)' }}>{item.holding_time_mins} mins</span>
      ) : (
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
      )
    },
    mistake_type: {
      label: 'Mistake',
      sortField: 'mistake_type',
      renderCell: (item) => item.mistake_type && item.mistake_type !== 'No Mistake' ? (
        <span className="text-xs" style={{ color: 'var(--text-sub)' }}>
          {item.mistake_type}
        </span>
      ) : (
        <span className="font-mono text-xs italic" style={{ color: 'var(--text-muted)' }}>
          None
        </span>
      )
    },
    roi: {
      label: 'ROI',
      sortField: 'roi',
      renderCell: (item) => item.roi !== null ? (
        <span
          className={`font-mono font-bold text-xs ${
            item.roi > 0 ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {item.roi > 0 ? '+' : ''}
          {item.roi.toFixed(1)}%
        </span>
      ) : (
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
      )
    },
    notes: {
      label: 'Notes',
      sortField: 'notes',
      renderCell: (item) => item.notes ? (
        <span className="text-xs" style={{ color: 'var(--text-sub)' }}>{item.notes}</span>
      ) : (
        <span className="font-mono text-xs italic" style={{ color: 'var(--text-muted)' }}>—</span>
      )
    },
    month: {
      label: 'Month',
      sortField: 'month',
      renderCell: (item) => item.month ? (
        <span className="font-mono text-xs" style={{ color: 'var(--text-sub)' }}>{item.month}</span>
      ) : (
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
      )
    },
    needs_review: {
      label: 'Needs Review',
      sortField: 'needs_review',
      renderCell: (item) => item.needs_review ? (
        <span style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316', border: '0.5px solid #f97316' }} className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded">
          Yes
        </span>
      ) : (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No</span>
      )
    },
    sync_source: {
      label: 'Sync Source',
      sortField: 'sync_source',
      renderCell: (item) => item.sync_source ? (
        <span className="font-mono text-xs" style={{ color: 'var(--text-sub)' }}>{item.sync_source}</span>
      ) : (
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>Manual</span>
      )
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center animate-pulse" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row md:items-start font-sans selection:bg-indigo-500/30" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT SIDE MAIN CONTAINER */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
        {/* MOBILE HEADER BAR */}
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
        <main className="flex-1 overflow-y-auto px-0">
          <div className="max-w-7xl mx-auto">
            {/* PAGE HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                  Trading Logs
                </h1>
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-sub)' }}>
                  Your complete trade history.
                </p>
              </div>
              <div>
                <Link
                  to="/trade-entry"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  className="hover:opacity-90 transition-all font-display shadow-lg shadow-cyan-500/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log New Trade</span>
                </Link>
              </div>
            </div>

            <div className="border-b mt-4 mb-6" style={{ borderColor: 'var(--border)' }} />

            {/* FILTER BAR SECTION CARD */}
            <div className="p-5 mb-5" style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0, 0, 0, 0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)' }}>
              {/* Row 1 Filter Fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Month Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Month
                  </label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text)', padding: '6px 10px' }}
                    className="w-full focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Months</option>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Year
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text)', padding: '6px 10px' }}
                    className="w-full focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Years</option>
                    {uniqueYears.map((y) => (
                      <option key={y} value={y.toString()}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Symbol Filter Text Input with absolute clearing button X */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Symbol
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={filterSymbol}
                      onChange={(e) => setFilterSymbol(e.target.value.toUpperCase())}
                      placeholder="e.g. BTCUSDT"
                      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text)', padding: '6px 10px' }}
                      className="placeholder-zinc-500 w-full focus:border-indigo-500 focus:outline-none font-mono"
                    />
                    {filterSymbol && (
                      <button
                        type="button"
                        onClick={() => setFilterSymbol('')}
                        style={{ color: 'var(--text-muted)' }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 hover:opacity-80 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Setup Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Setup
                  </label>
                  <select
                    value={filterSetup}
                    onChange={(e) => setFilterSetup(e.target.value)}
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text)', padding: '6px 10px' }}
                    className="w-full focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Setups</option>
                    {uniqueSetups.map((setupName) => (
                      <option key={setupName} value={setupName}>
                        {setupName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2 Filter Fields */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                {/* Status Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider mr-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                    Status:
                  </span>
                  {['All', 'Win', 'Loss', 'Breakeven'].map((st) => {
                    const isActive = filterStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFilterStatus(st)}
                        style={{
                          backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                          border: isActive ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
                          color: isActive ? 'var(--accent)' : 'var(--text-sub)',
                          padding: '5px 14px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: isActive ? 600 : 500,
                          cursor: 'pointer',
                        }}
                        className={isActive ? 'transition-all' : 'hover:bg-[var(--bar)] transition-all'}
                      >
                        {st}
                      </button>
                    );
                  })}

                  {/* Needs Review Filter Toggle Pill */}
                  <button
                    type="button"
                    onClick={() => setFilterNeedsReview(prev => !prev)}
                    style={{
                      backgroundColor: filterNeedsReview ? 'rgba(249,115,22,0.12)' : 'transparent',
                      border: filterNeedsReview ? '1px solid #f97316' : '0.5px solid var(--border)',
                      color: filterNeedsReview ? '#f97316' : 'var(--text-sub)',
                      padding: '5px 14px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: filterNeedsReview ? 600 : 500,
                      cursor: 'pointer',
                      marginLeft: '8px'
                    }}
                    className={filterNeedsReview ? 'transition-all font-semibold' : 'hover:bg-[var(--bar)] transition-all'}
                  >
                    ⚠️ Needs Review
                  </button>
                </div>

                {/* Executions, Mistakes & Columns selectors */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Executions */}
                  <select
                    value={filterExecution}
                    onChange={(e) => setFilterExecution(e.target.value)}
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text)', padding: '6px 10px' }}
                    className="w-auto focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Executions</option>
                    <option value="BEST TRADE">BEST TRADE</option>
                    <option value="GOOD TRADE">GOOD TRADE</option>
                    <option value="AVERAGE TRADE">AVERAGE TRADE</option>
                    <option value="POOR TRADE">POOR TRADE</option>
                    <option value="BAD TRADE">BAD TRADE</option>
                  </select>

                  {/* Mistakes dropdown */}
                  <select
                    value={filterMistakeType}
                    onChange={(e) => setFilterMistakeType(e.target.value)}
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text)', padding: '6px 10px' }}
                    className="w-auto focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Mistakes</option>
                    <option value="Technical">Technical</option>
                    <option value="Psychological">Psychological</option>
                    <option value="Risk Management">Risk Management</option>
                    <option value="No Mistake">No Mistake</option>
                  </select>

                  {/* Columns selector trigger button */}
                  <button
                    type="button"
                    onClick={() => {
                      setTempSelectedColumns({ ...selectedColumns });
                      setIsColumnModalOpen(true);
                    }}
                    style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text-sub)' }}
                    className="rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 hover:opacity-80"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Columns</span>
                  </button>

                  {/* Reset Filters button */}
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-3.5 py-2 text-xs font-semibold text-zinc-400 border border-zinc-800 hover:text-white rounded-xl hover:bg-zinc-850 cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ADDITION 1 — SUMMARY STATS BAR */}
            <div className="grid gap-4 mb-5 md:grid animate-in fade-in duration-200" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {/* Card 1: TOTAL TRADES */}
              <div 
                style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}
                className="p-4"
              >
                <div style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  TOTAL TRADES
                </div>
                <div className="mt-1 font-mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
                  {calculatedStats.totalCount}
                </div>
                <div className="text-[10px] font-mono mt-1 flex flex-wrap items-center gap-1" style={{ color: 'var(--text-sub)' }}>
                  <span className="text-green-500 font-bold">W: {calculatedStats.winCount}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-red-500 font-bold">L: {calculatedStats.lossCount}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-500 font-bold">BE: {calculatedStats.breakEvenCount}</span>
                </div>
              </div>

              {/* Card 2: NET P&L */}
              <div 
                style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}
                className="p-4"
              >
                <div style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  NET P&L
                </div>
                <div 
                  className="mt-1 font-mono"
                  style={{ fontSize: '20px', fontWeight: 700, color: calculatedStats.totalPnl > 0 ? '#22c55e' : calculatedStats.totalPnl < 0 ? '#ef4444' : 'var(--text)' }}
                >
                  {formatINRStat(calculatedStats.totalPnl)}
                </div>
              </div>

              {/* Card 3: PROFIT FACTOR */}
              <div 
                style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}
                className="p-4"
              >
                <div style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  PROFIT FACTOR
                </div>
                <div 
                  className="mt-1 font-mono" 
                  style={{ fontSize: '20px', fontWeight: 700, color: calculatedStats.profitFactor >= 1.0 ? 'var(--accent)' : '#ef4444' }}
                >
                  {calculatedStats.profitFactor === Infinity ? 'MAX' : calculatedStats.profitFactor === 0 ? '--' : calculatedStats.profitFactor.toFixed(2)}
                </div>
              </div>

              {/* Card 4: WIN RATE */}
              <div 
                style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}
                className="p-4"
              >
                <div style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  WIN RATE
                </div>
                <div className="mt-1 font-mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>
                  {calculatedStats.winRate.toFixed(1)}%
                </div>
              </div>

              {/* Card 5: AVG R */}
              <div 
                style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}
                className="p-4"
              >
                <div style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  AVG R
                </div>
                <div 
                  className="mt-1 font-mono"
                  style={{ fontSize: '20px', fontWeight: 700, color: calculatedStats.avgR >= 0 ? 'var(--accent)' : '#ef4444' }}
                >
                  {calculatedStats.avgR > 0 ? '+' : ''}{calculatedStats.avgR.toFixed(2)}R
                </div>
              </div>
            </div>



            {/* ERROR SKELETON OR DYNAMIC TABLES LAYOUT */}
            {loading ? (
              <div className="overflow-hidden animate-pulse" style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b select-none font-sans" style={{ backgroundColor: 'var(--row)', borderColor: 'var(--border)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th className="px-4 py-4 w-12 text-center">
                        <div className="h-4 rounded w-4 mx-auto" style={{ backgroundColor: 'var(--row)' }} />
                      </th>
                      <th className="px-4 py-4 w-10 text-center">#</th>
                      {ALL_COLUMNS_INFO.map((col) => {
                        if (!selectedColumns[col.id]) return null;
                        return (
                          <th key={col.id} className="px-4 py-4">{col.label}</th>
                        );
                      })}
                      <th className="px-4 py-4 w-12 text-center">AI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <tr key={idx} className="border-t animate-pulse opacity-60" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-4.5 w-12 text-center">
                          <div className="h-4 rounded w-4 mx-auto" style={{ backgroundColor: 'var(--row)' }} />
                        </td>
                        <td className="px-4 py-4.5"><div className="h-4 rounded w-4" style={{ backgroundColor: 'var(--row)' }} /></td>
                        {ALL_COLUMNS_INFO.map((col) => {
                          if (!selectedColumns[col.id]) return null;
                          return (
                            <td key={col.id} className="px-4 py-4.5">
                              <div className="h-4 rounded w-12" style={{ backgroundColor: 'var(--row)' }} />
                            </td>
                          );
                        })}
                        <td className="px-4 py-4.5 text-center"><div className="h-4 rounded w-8 mx-auto" style={{ backgroundColor: 'var(--row)' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : allTrades.length === 0 ? (
              /* EMPTY JOURNAL NO TRADES YET */
              <div className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                  <BarChart className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>Your Trading Journal is Empty</h3>
                <p className="text-sm mt-3 max-w-sm" style={{ color: 'var(--text-sub)' }}>
                  Record your completed trades to visualize metric distributions, calculate dynamic win ratios, and discover key behavioral leakages.
                </p>
                <Link
                  to="/trade-entry"
                  className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl px-6 py-3.5 text-xs uppercase tracking-widest font-mono transition-all inline-flex items-center gap-2 shadow-lg shadow-indigo-600/15"
                >
                  <span>Log Your First Trade</span>
                  <Plus className="w-4 h-4" />
                </Link>
              </div>
            ) : filteredTrades.length === 0 ? (
              /* EMPTY LOG RESULTS FILTER ZERO */
              <div className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-16 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 text-zinc-500" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text)' }}>No Trades Match Filters</h3>
                <p className="text-xs mt-2 max-w-xs" style={{ color: 'var(--text-sub)' }}>
                  Adjust your criteria or clear active selectors to inspect matching journaled events.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-6 hover:opacity-90 font-bold px-4 py-2 text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              </div>
            ) : (
              /* MAIN INTERACTIVE SORTABLE DATATABLE */
              <div className="flex flex-col animate-in fade-in duration-200">
                <div id="trading-logs-datatable-container" className="overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderBottom: 'none', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
                  {/* BULK ACTION BAR */}
                  {selectedTradeIds.length > 0 && (
                    <div 
                      style={{ 
                        backgroundColor: 'var(--card)', 
                        border: '0.5px solid var(--accent)',
                        borderRadius: '10px'
                      }} 
                      className="m-3 p-[12px] px-[16px] flex flex-wrap items-center gap-[12px] transition-all duration-200 animate-in slide-in-from-top-2"
                    >
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                        <span className="font-extrabold text-[#f97316] font-mono">{selectedTradeIds.length}</span> trades selected
                      </span>
                      
                      <div className="h-5 w-[1px]" style={{ backgroundColor: 'var(--border)' }} />
                      
                      <span className="text-[12px]" style={{ color: 'var(--text-sub)' }}>
                        Assign Setup:
                      </span>
                      
                      <select
                        value={selectedStrategyId}
                        onChange={(e) => setSelectedStrategyId(e.target.value)}
                        style={{ 
                          backgroundColor: 'var(--card)', 
                          border: '0.5px solid var(--border)', 
                          color: 'var(--text)',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px'
                        }}
                        className="focus:border-indigo-500 focus:outline-none cursor-pointer w-48 font-mono"
                      >
                        <option value="" disabled>Select a setup...</option>
                        {strategiesList.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={bulkLoading || !selectedStrategyId}
                        onClick={handleBulkApplySetup}
                        style={{
                          backgroundColor: !selectedStrategyId ? 'var(--border)' : 'var(--accent)',
                          color: '#ffffff',
                          borderRadius: '7px',
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: (!selectedStrategyId || bulkLoading) ? 'not-allowed' : 'pointer',
                          opacity: (!selectedStrategyId) ? 0.6 : 1
                        }}
                        className="transition-all hover:opacity-90 flex items-center gap-2"
                      >
                        {bulkLoading ? (
                          <>
                            <span className="animate-spin text-xs">⏳</span>
                            <span>Applying...</span>
                          </>
                        ) : (
                          <span>Apply to {selectedTradeIds.length} trades</span>
                        )}
                      </button>

                      <div className="flex-grow" />

                      <span 
                        onClick={() => setSelectedTradeIds([])}
                        className="text-[12px] cursor-pointer hover:underline font-semibold"
                        style={{ color: 'var(--text-sub)' }}
                      >
                        Clear selection
                      </span>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto">
                    <table 
                      onMouseEnter={() => setIsTableHovered(true)}
                      onMouseLeave={() => setIsTableHovered(false)}
                      className="w-full text-left border-collapse"
                    >
                    <thead>
                      <tr className="border-b select-none font-sans" style={{ background: 'rgba(0, 0, 0, 0.04)', borderColor: 'rgba(0, 0, 0, 0.08)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {/* SELECT ALL CHECKBOX */}
                        <th className="px-4 py-4 w-12 text-center">
                          <div 
                            className={`transition-all duration-200 flex items-center justify-center ${
                              (isTableHovered || selectedTradeIds.length > 0) ? 'opacity-100 scale-100' : 'opacity-100 md:opacity-0 md:scale-95 md:pointer-events-none'
                            }`}
                          >
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                const visibleIds = filteredTrades.map(t => t.id).filter((id): id is string => typeof id === 'string');
                                const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedTradeIds.includes(id));
                                if (allVisibleSelected) {
                                  setSelectedTradeIds(prev => prev.filter(id => !visibleIds.includes(id)));
                                } else {
                                  setSelectedTradeIds(prev => {
                                    const newSel = [...prev];
                                    visibleIds.forEach(id => {
                                      if (!newSel.includes(id)) newSel.push(id);
                                    });
                                    return newSel;
                                  });
                                }
                              }}
                              style={{
                                width: '16px',
                                height: '16px',
                                border: (filteredTrades.length > 0 && filteredTrades.every(t => t.id && selectedTradeIds.includes(t.id))) || (filteredTrades.some(t => t.id && selectedTradeIds.includes(t.id)) && !filteredTrades.every(t => t.id && selectedTradeIds.includes(t.id)))
                                  ? '1.5px solid var(--accent)'
                                  : '1.5px solid var(--border-md)',
                                borderRadius: '4px',
                                backgroundColor: (filteredTrades.length > 0 && filteredTrades.some(t => t.id && selectedTradeIds.includes(t.id)))
                                  ? 'var(--accent)'
                                  : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              className="transition-all shrink-0"
                            >
                              {filteredTrades.length > 0 && filteredTrades.every(t => t.id && selectedTradeIds.includes(t.id)) && (
                                <svg 
                                  className="w-3 h-3 text-white" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24" 
                                  strokeWidth="3.5"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                              {filteredTrades.length > 0 && filteredTrades.some(t => t.id && selectedTradeIds.includes(t.id)) && !filteredTrades.every(t => t.id && selectedTradeIds.includes(t.id)) && (
                                <div 
                                  style={{
                                    width: '8px',
                                    height: '2px',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '1px'
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </th>
                        
                        <th className="px-4 py-4 w-10 text-center">#</th>
                        
                        {/* Dynamic selectable columns */}
                        {ALL_COLUMNS_INFO.map((col) => {
                          if (!selectedColumns[col.id]) return null;
                          const colDef = colDefinitions[col.id];
                          const isSortable = ['date', 'symbol', 'pnl', 'r_multiple', 'roi', 'holding_time_mins'].includes(col.id);
                          return (
                            <th
                              key={col.id}
                              onClick={isSortable ? () => toggleSort(colDef.sortField) : undefined}
                              className={`px-4 py-4 ${isSortable ? 'cursor-pointer hover:text-indigo-400 transition-colors' : ''} whitespace-nowrap`}
                            >
                              <div className="flex items-center gap-1">
                                <span>{col.label}</span>
                                {isSortable && sortColumn === colDef.sortField && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-[#818cf8]" /> : <ChevronDown className="w-3 h-3 text-[#818cf8]" />
                                )}
                              </div>
                            </th>
                          );
                        })}
                        <th className="px-4 py-4 w-12 text-center">AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTrades.map((item, index) => {
                        const isEven = index % 2 === 1;
                        return (
                          <tr
                            key={item.id}
                            onClick={() => navigate(`/trading-logs/${item.id}`)}
                            className="cursor-pointer transition-colors text-sm"
                            style={{ 
                              borderBottom: '1px solid rgba(0, 0, 0, 0.05)', 
                              color: 'var(--text)',
                              backgroundColor: isEven ? 'rgba(0, 0, 0, 0.018)' : 'transparent'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.025)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isEven ? 'rgba(0, 0, 0, 0.018)' : 'transparent')}
                          >
                            {/* Row Checkbox Column */}
                            <td 
                              style={{ padding: '10px 16px' }} 
                              className="text-center w-12 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.id) {
                                  const id = item.id;
                                  setSelectedTradeIds(prev => 
                                    prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
                                  );
                                }
                              }}
                            >
                              <div 
                                className={`transition-all duration-200 flex items-center justify-center ${
                                  (isTableHovered || selectedTradeIds.length > 0) ? 'opacity-100 scale-100' : 'opacity-100 md:opacity-0 md:scale-95 md:pointer-events-none'
                                }`}
                              >
                                <div
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    border: (item.id && selectedTradeIds.includes(item.id)) ? '1.5px solid var(--accent)' : '1.5px solid var(--border-md)',
                                    borderRadius: '4px',
                                    backgroundColor: (item.id && selectedTradeIds.includes(item.id)) ? 'var(--accent)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                  }}
                                  className="transition-all shrink-0"
                                >
                                  {item.id && selectedTradeIds.includes(item.id) && (
                                    <svg 
                                      className="w-3 h-3 text-white" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24" 
                                      strokeWidth="3.5"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Counter Index */}
                            <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '13px' }} className="text-center font-bold w-10">
                              {(currentPage - 1) * tradesPerPage + index + 1}
                            </td>

                            {/* Dynamic selectable trade detail columns cells */}
                            {ALL_COLUMNS_INFO.map((col) => {
                              if (!selectedColumns[col.id]) return null;
                              return (
                                <td key={col.id} style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text)' }} className="whitespace-nowrap font-sans">
                                  {colDefinitions[col.id].renderCell(item)}
                                </td>
                              );
                            })}

                            {/* AI Action column */}
                            <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text)' }} className="whitespace-nowrap text-center font-sans">
                              <button
                                id={`logs-table-ask-ai-${item.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/ai-teacher?tradeId=${item.id}`);
                                }}
                                style={{
                                  backgroundColor: 'var(--accent-muted)',
                                  color: 'var(--accent)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 650,
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                                className="transition-all hover:opacity-85"
                              >
                                AI
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ADDITION 2 — PAGINATION CONTROLS */}
              {calculatedStats.totalCount > 0 && (
                <div 
                  style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0,0,0,0.06)', borderTop: 'none', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}
                  className="px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-muted)' }}>Trades per page:</span>
                    <select
                      value={tradesPerPage}
                      onChange={(e) => {
                        setTradesPerPage(parseInt(e.target.value, 10));
                        setCurrentPage(1);
                      }}
                      style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                      className="rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer text-xs font-bold"
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ color: 'var(--text-sub)', fontSize: '13px' }} className="text-center">
                    Showing {calculatedStats.totalCount === 0 ? 0 : (currentPage - 1) * tradesPerPage + 1}–{Math.min(currentPage * tradesPerPage, calculatedStats.totalCount)} of {calculatedStats.totalCount} trades
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      style={{
                        backgroundColor: currentPage === 1 ? 'transparent' : 'var(--row)',
                        borderColor: 'var(--border)',
                        color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text)',
                        borderWidth: '1px'
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-all ${
                        currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage * tradesPerPage >= calculatedStats.totalCount}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      style={{
                        backgroundColor: currentPage * tradesPerPage >= calculatedStats.totalCount ? 'transparent' : 'var(--row)',
                        borderColor: 'var(--border)',
                        color: currentPage * tradesPerPage >= calculatedStats.totalCount ? 'var(--text-muted)' : 'var(--text)',
                        borderWidth: '1px'
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-all ${
                        currentPage * tradesPerPage >= calculatedStats.totalCount ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </main>

        {/* COLUMN SELECTOR MODAL */}
        {isColumnModalOpen && (
          <div id="column-selector-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div 
              style={{ backgroundColor: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '16px' }}
              className="w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <h3 className="text-sm font-bold tracking-wide uppercase font-mono text-[var(--text)]">
                  Configure Columns
                </h3>
                <button
                  type="button"
                  onClick={() => setIsColumnModalOpen(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-1 rounded-lg hover:bg-[var(--row)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List of Columns */}
              <div className="p-5 flex-1 overflow-y-auto space-y-3">
                <p className="text-xs text-[var(--text-sub)] mb-2">
                  Select which column fields to display in your active trading logs table.
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {ALL_COLUMNS_INFO.map((col) => {
                    const isChecked = !!tempSelectedColumns[col.id];
                    return (
                      <label
                        key={col.id}
                        style={{ 
                          backgroundColor: isChecked ? 'rgba(129, 140, 248, 0.05)' : 'transparent',
                          borderColor: isChecked ? 'var(--accent)' : 'var(--border)'
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer select-none transition-all hover:bg-[var(--row)]`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setTempSelectedColumns((prev) => ({
                              ...prev,
                              [col.id]: !prev[col.id],
                            }));
                          }}
                          className="rounded border-[var(--border)] text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                        />
                        <span className="font-semibold text-[var(--text-sub)]">
                          {col.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-[var(--border)] flex justify-end gap-2.5" style={{ backgroundColor: 'var(--row)' }}>
                <button
                  type="button"
                  onClick={() => setIsColumnModalOpen(false)}
                  style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-sub)' }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--bar)] cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedColumns(tempSelectedColumns);
                    localStorage.setItem('tl-log-columns', JSON.stringify(tempSelectedColumns));
                    setIsColumnModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition-all shadow-md shadow-indigo-600/10"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
