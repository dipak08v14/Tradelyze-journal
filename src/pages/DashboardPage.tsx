import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import { DonutChart } from '../components/DonutChart';
import {
  Menu,
  BarChart2,
  TrendingUp,
  Trophy,
  Activity,
  AlertTriangle,
  Flame,
  HelpCircle,
  TrendingDown,
  Calendar,
  Sparkles,
  X,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { getLibraryConfidenceMessage } from '../lib/clipEmbedder';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const MONTH_INDEX = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CALENDAR_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatDayHeaderDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const SemicircleGauge: React.FC<{
  percentage: number;
  wCount: number;
  beCount: number;
  lCount: number;
  isDayWin?: boolean;
}> = ({ wCount, beCount, lCount }) => {
  const total = wCount + lCount;
  const fraction = total > 0 ? wCount / total : 0;
  const cx = 50, cy = 48, R = 38;
  const arcPath = `M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy}`;
  return (
    <svg width="100" height="62" viewBox="0 0 100 62" overflow="visible">
      {/* Full red arc: background */}
      <path
        d={arcPath}
        fill="none"
        stroke="#DF1C30"
        strokeWidth={7}
        strokeLinecap="butt"
      />
      {/* Green arc: pathLength=1 means strokeDasharray is in 0-to-1 scale */}
      <path
        d={arcPath}
        fill="none"
        stroke="#008F67"
        strokeWidth={7}
        strokeLinecap="butt"
        pathLength={1}
        strokeDasharray={`${fraction} 1`}
        strokeDashoffset={0}
      />
      <text
        x={cx - R}
        y={cy + 13}
        textAnchor="middle"
        fontSize="10"
        fill="#008F67"
        fontWeight="600"
      >{wCount}</text>
      <text
        x={cx}
        y={cy + 13}
        textAnchor="middle"
        fontSize="10"
        fill="#9ca3af"
      >{beCount}</text>
      <text
        x={cx + R}
        y={cy + 13}
        textAnchor="middle"
        fontSize="10"
        fill="#DF1C30"
        fontWeight="600"
      >{lCount}</text>
    </svg>
  );
};

const CircleGauge: React.FC<{ value: number }> = ({ value }) => {
  const fraction = Math.min(value / 3, 1);
  const cx = 30, cy = 30, r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="60" height="60" viewBox="0 0 60 60">
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#DF1C30"
        strokeWidth={7}
        strokeLinecap="butt"
      />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#008F67"
        strokeWidth={7}
        strokeLinecap="butt"
        strokeDasharray={`${fraction * circ} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </svg>
  );
};

const RadarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '4px 8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        minWidth: '0px',
        whiteSpace: 'nowrap'
      }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 500,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '1px'
        }}>
          {item.payload.subject}
        </div>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--accent)'
        }}>
          {item.value}%
        </div>
      </div>
    );
  }
  return null;
};

const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayStr = String(dateObj.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthStr = monthNames[dateObj.getMonth()];
  return `${dayStr} ${monthStr} ${year}`;
};

const getBrokerCode = (broker: any) => {
  const name = (broker.broker_name || broker.broker_type || '').toLowerCase();
  if (name.includes('dhan')) return 'DH';
  if (name.includes('xm') || name.includes('global')) return 'XM';
  if (name.includes('metatrader') || name.includes('mt')) return 'MT';
  if (name.includes('zerodha')) return 'ZE';
  if (name.includes('upstox')) return 'UP';
  if (name.includes('angel') || name.includes('an')) return 'AN';
  
  // Generic fallback: first 2 letters
  const clean = name.replace(/[^a-z]/g, '');
  return clean.slice(0, 2).toUpperCase() || 'BR';
};

const getAccountNumber = (broker: any) => {
  return broker.account_login || broker.account_id || broker.account_number || 'N/A';
};

export const DashboardPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  // Date range picker state
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Header compact date range picker state
  const [isHeaderDatePickerOpen, setIsHeaderDatePickerOpen] = useState(false);
  const headerDatePickerRef = useRef<HTMLDivElement>(null);

  const [headerPickerLeftMonth, setHeaderPickerLeftMonth] = useState<number>(() => parseLocalDate(startDate).getMonth());
  const [headerPickerLeftYear, setHeaderPickerLeftYear] = useState<number>(() => parseLocalDate(startDate).getFullYear());

  const [headerPickerRightMonth, setHeaderPickerRightMonth] = useState<number>(() => {
    const s = parseLocalDate(startDate);
    const e = parseLocalDate(endDate);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      let m = s.getMonth() + 1;
      if (m > 11) return 0;
      return m;
    }
    return e.getMonth();
  });
  const [headerPickerRightYear, setHeaderPickerRightYear] = useState<number>(() => {
    const s = parseLocalDate(startDate);
    const e = parseLocalDate(endDate);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      let m = s.getMonth() + 1;
      let y = s.getFullYear();
      if (m > 11) return y + 1;
      return y;
    }
    return e.getFullYear();
  });

  const [headerPickerTempStart, setHeaderPickerTempStart] = useState<Date | null>(() => parseLocalDate(startDate));
  const [headerPickerTempEnd, setHeaderPickerTempEnd] = useState<Date | null>(() => parseLocalDate(endDate));
  const [headerPickerHoveredDate, setHeaderPickerHoveredDate] = useState<Date | null>(null);
  const [isSelectingSecondDate, setIsSelectingSecondDate] = useState(false);

  // Sync calendar views when picker is opened
  useEffect(() => {
    if (isHeaderDatePickerOpen) {
      const s = parseLocalDate(startDate);
      const e = parseLocalDate(endDate);
      setHeaderPickerLeftMonth(s.getMonth());
      setHeaderPickerLeftYear(s.getFullYear());
      setHeaderPickerTempStart(s);
      setHeaderPickerTempEnd(e);
      setIsSelectingSecondDate(false);

      if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
        let m = s.getMonth() + 1;
        let y = s.getFullYear();
        if (m > 11) {
          m = 0;
          y += 1;
        }
        setHeaderPickerRightMonth(m);
        setHeaderPickerRightYear(y);
      } else {
        setHeaderPickerRightMonth(e.getMonth());
        setHeaderPickerRightYear(e.getFullYear());
      }
    }
  }, [isHeaderDatePickerOpen, startDate, endDate]);

  // Handle click outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerDatePickerRef.current && !headerDatePickerRef.current.contains(event.target as Node)) {
        setIsHeaderDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Monthly Calendar Navigation State
  const [calMonth, setCalMonth] = useState<number>(() => new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(() => new Date().getFullYear());

  const prevMonth = () => {
    setCalMonth((prev) => {
      if (prev === 0) {
        setCalYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setCalMonth((prev) => {
      if (prev === 11) {
        setCalYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [bottomTab, setBottomTab] = useState<'positions' | 'trades'>('positions');

  // Broker Sync States
  const [syncStatus, setSyncStatus] = useState<'idle' | 'active' | 'inactive'>('idle');
  const [totalSyncedCount, setTotalSyncedCount] = useState<number>(0);
  const [needsReviewCount, setNeedsReviewCount] = useState<number>(0);
  const [syncLoading, setSyncLoading] = useState<boolean>(true);

  // Dhan broker dashboard states
  const [dhanPositions, setDhanPositions] = useState<any[]>([]);
  const [hasDhanConnection, setHasDhanConnection] = useState<boolean>(false);
  const [fetchingPositions, setFetchingPositions] = useState<boolean>(false);
  const [brokerConnections, setBrokerConnections] = useState<any[]>([]);
  const [selectedBroker, setSelectedBroker] = useState<any>(null);
  const [isBrokerDropdownOpen, setIsBrokerDropdownOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBrokerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Broker Sync Widget Data
  const fetchBrokerSyncData = async () => {
    if (!userId) return;
    try {
      // 1. Fetch connected brokers
      const { data: connections, error: connError } = await supabase
        .from('broker_connections')
        .select('*')
        .eq('user_id', userId);

      if (connError) throw connError;

      let status: 'idle' | 'active' | 'inactive' = 'idle';
      let totalSynced = 0;
      let hasDhan = false;

      if (connections && connections.length > 0) {
        const anyActive = connections.some((c: any) => c.is_active);
        status = anyActive ? 'active' : 'inactive';
        totalSynced = connections.reduce((sum: number, c: any) => sum + (c.total_synced || 0), 0);
        hasDhan = connections.some((c: any) => c.broker_type === 'dhan' && c.is_active);
      }

      setHasDhanConnection(hasDhan);
      setBrokerConnections(connections || []);
      if (connections && connections.length > 0) {
        setSelectedBroker((prev: any) => {
          if (prev && connections.some((c: any) => c.id === prev.id)) {
            return connections.find((c: any) => c.id === prev.id);
          }
          return connections[0];
        });
      } else {
        setSelectedBroker(null);
      }

      // Fetch open positions if user has Dhan connection
      if (hasDhan) {
        try {
          setFetchingPositions(true);
          const { data: sessionData } = await supabase.auth.getSession();
          const tok = sessionData?.session?.access_token;
          if (tok) {
            const res = await fetch('/api/dhan-open-positions', {
              headers: {
                'Authorization': `Bearer ${tok}`
              }
            });
            if (res.ok) {
              const data = await res.json();
              setDhanPositions(data.positions || []);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch Dhan positions on dashboard:', err);
        } finally {
          setFetchingPositions(false);
        }
      } else {
        setDhanPositions([]);
      }

      // 2. Fetch needs review count from trades table
      const { count: needsReview, error: countError } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('needs_review', true);

      if (countError) throw countError;

      setSyncStatus(status);
      setTotalSyncedCount(totalSynced);
      setNeedsReviewCount(needsReview || 0);
    } catch (err) {
      console.error('Error fetching broker sync dashboard info:', err);
    } finally {
      setSyncLoading(false);
    }
  };

  // Poll broker sync data every 30 seconds
  useEffect(() => {
    if (!userId) return;
    fetchBrokerSyncData();

    const interval = setInterval(() => {
      fetchBrokerSyncData();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId]);
  
  // Database States
  const [trades, setTrades] = useState<any[]>([]);
  const [allHistoryTrades, setAllHistoryTrades] = useState<any[]>([]);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState<boolean>(false);
  const [startingBalanceInput, setStartingBalanceInput] = useState<number>(() => {
    const saved = localStorage.getItem('tl-starting-balance');
    return saved ? parseFloat(saved) : 0;
  });

  const handleStartingBalanceChange = (val: number) => {
    setStartingBalanceInput(val);
    localStorage.setItem('tl-starting-balance', String(val));
  };
  const [psychologyData, setPsychologyData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [rulesData, setRulesData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [visualLibraryCount, setVisualLibraryCount] = useState<number>(0);

  // Fetch global visual library count
  useEffect(() => {
    if (!userId) return;
    const fetchVisualLibraryCount = async () => {
      try {
        const { count, error } = await supabase
          .from('trade_visual_embeddings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (error) throw error;
        setVisualLibraryCount(count || 0);
      } catch (err) {
        console.error('Error fetching visual library count:', err);
      }
    };
    fetchVisualLibraryCount();
  }, [userId]);

  const confidence = useMemo(() => {
    return getLibraryConfidenceMessage(visualLibraryCount);
  }, [visualLibraryCount]);

  const lastSyncedTime = useMemo(() => {
    if (!brokerConnections || brokerConnections.length === 0) return 'Never';
    const timestamps = brokerConnections
      .map(c => c.last_sync_at)
      .filter(Boolean)
      .map(t => new Date(t).getTime());
    
    if (timestamps.length === 0) return 'Never';
    const maxTimestamp = Math.max(...timestamps);
    const date = new Date(maxTimestamp);
    
    // Format exactly as: "22 Jun 2026, 07:59 AM"
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStr = months[date.getMonth()];
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    
    return `${day} ${monthStr} ${year}, ${hoursStr}:${minutes} ${ampm}`;
  }, [brokerConnections]);

  const [accentColorState, setAccentColorState] = useState('#06b6d4');
  useEffect(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (color) setAccentColorState(color);
  }, []); // re-read on mount; theme changes trigger re-render via context so this will update

  // Safety Redirection for Auth
  useEffect(() => {
    if (!authLoading && !userId) {
      navigate('/login');
    }
  }, [userId, authLoading, navigate]);

  // Fetch Year List Once on Mount
  useEffect(() => {
    if (!userId) return;
    const fetchYears = async () => {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('year')
          .eq('user_id', userId);
        if (error) throw error;

        const currentYear = new Date().getFullYear();
        const yearsSet = new Set<number>();
        yearsSet.add(currentYear);
        if (data) {
          data.forEach((item: any) => {
            if (typeof item.year === 'number') {
              yearsSet.add(item.year);
            }
          });
        }
        setAvailableYears(Array.from(yearsSet).sort((a, b) => b - a));
      } catch (err: any) {
        console.error('Error fetching unique years:', err);
      }
    };
    fetchYears();
  }, [userId]);

  // Fetch Dashboard Specific Contexts
  useEffect(() => {
    if (!userId) return;

    const fetchDashboardContext = async () => {
      try {
        setLoading(true);

        // STEP 1 — Fetch filtered and all history trades in parallel:
        const [tradesRes, allHistoryRes] = await Promise.all([
          supabase
            .from('trades')
            .select('id, *, strategies(name)')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true }),
          supabase
            .from('trades')
            .select('id, *, strategies(name)')
            .eq('user_id', userId)
            .order('date', { ascending: true })
        ]);

        if (tradesRes.error) throw tradesRes.error;
        if (allHistoryRes.error) throw allHistoryRes.error;

        const activeTrades = tradesRes.data || [];
        setTrades(activeTrades);
        setAllHistoryTrades(allHistoryRes.data || []);

        if (activeTrades.length === 0) {
          setPsychologyData([]);
          setRiskData([]);
          setRulesData([]);
          setLoading(false);
          return;
        }

        const tradeIds = activeTrades.map((t: any) => t.id);

        // STEP 3 — Fetch psychology, risk, tech rules in parallel securely
        const [psychRes, riskRes, rulesRes] = await Promise.all([
          supabase
            .from('trade_psychology')
            .select('trade_id, psychological_condition_pct')
            .in('trade_id', tradeIds)
            .eq('user_id', userId),
          supabase
            .from('trade_risk_management')
            .select('trade_id, followed_risk_rules_pct')
            .in('trade_id', tradeIds)
            .eq('user_id', userId),
          supabase
            .from('trade_rule_adherence')
            .select('trade_id, followed')
            .in('trade_id', tradeIds)
            .eq('user_id', userId)
        ]);

        if (psychRes.error) console.error('Psychology fetch error:', psychRes.error);
        if (riskRes.error) console.error('Risk management fetch error:', riskRes.error);
        if (rulesRes.error) console.error('Rule adherence fetch error:', rulesRes.error);

        setPsychologyData(psychRes.data || []);
        setRiskData(riskRes.data || []);
        setRulesData(rulesRes.data || []);

      } catch (err: any) {
        console.error('Sync failure processing trade matrices:', err);
        showError(err.message || 'Error occurred loading performance variables.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardContext();
  }, [userId, startDate, endDate, showError]);

  // Indian Rupee Locale Formatting Helper
  const formatINR = (value: number) => {
    const formatted = Math.abs(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${value < 0 ? '-' : ''}₹${formatted}`;
  };

  const formatPositiveINR = (value: number) => {
    return '₹' + Math.abs(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Score colors rule helper (green >= 70, amber >= 50, red < 50)
  const getScoreColorClass = (score: number) => {
    if (score >= 70) return 'text-[#22c55e] font-bold';
    if (score >= 50) return 'text-[#f59e0b] font-bold';
    return 'text-[#ef4444] font-bold';
  };

  const getPercentTextColor = (score: number) => {
    if (score >= 70) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreBgClass = (score: number) => {
    if (score >= 70) return 'bg-[#22c55e]';
    if (score >= 50) return 'bg-[#f59e0b]';
    return 'bg-[#ef4444]';
  };

  const formatPnlNoDecimals = (value: number) => {
    const formatted = Math.abs(value).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${value < 0 ? '-' : ''}₹${formatted}`;
  };

  // Memoized Metric Variables
  const stats = useMemo(() => {
    const wins = trades.filter((t) => t.status === 'Win');
    const losses = trades.filter((t) => t.status === 'Loss');
    const breakevens = trades.filter((t) => t.status === 'Breakeven');
    const totalTrades = trades.length;

    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    const rTrades = trades.filter((t) => typeof t.r_multiple === 'number');
    const avgR = rTrades.length > 0
      ? rTrades.reduce((sum, t) => sum + t.r_multiple, 0) / rTrades.length
      : 0;
    const totalRSum = rTrades.reduce((sum, t) => sum + t.r_multiple, 0);

    const totalWinsPnl = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLossesPnl = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));

    const profitFactor = totalLossesPnl > 0
      ? totalWinsPnl / totalLossesPnl
      : (totalWinsPnl > 0 ? 999 : 0);

    const avgWin = wins.length > 0 ? totalWinsPnl / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossesPnl / losses.length : 0;
    const avgWinLossRatio = avgLoss > 0
      ? avgWin / avgLoss
      : (avgWin > 0 ? 999 : 0);

    const largestWinTrade = wins.length > 0
      ? Math.max(...wins.map((t) => typeof t.pnl === 'number' ? t.pnl : 0))
      : 0;
    const largestLossTrade = losses.length > 0
      ? Math.abs(Math.min(...losses.map((t) => typeof t.pnl === 'number' ? t.pnl : 0)))
      : 0;

    // Daily aggregations
    const dailyPnlMap: Record<string, number> = {};
    trades.forEach((t) => {
      const d = t.date;
      if (d) {
        if (!dailyPnlMap[d]) dailyPnlMap[d] = 0;
        dailyPnlMap[d] += (t.pnl || 0);
      }
    });

    const sortedDays = Object.entries(dailyPnlMap).sort((a, b) => a[0].localeCompare(b[0]));
    const winDays = sortedDays.filter(([_, value]) => value > 0).length;
    const lossDays = sortedDays.filter(([_, value]) => value < 0).length;
    const beDays = sortedDays.filter(([_, value]) => value === 0).length;
    const tradingDaysCount = sortedDays.length;

    // DNT Days calculation
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const totalCalDays = Math.max(1, Math.round((endObj.getTime() - startObj.getTime()) / 86400000) + 1);
    const dntDays = Math.max(0, totalCalDays - tradingDaysCount);

    const largestProfitDay = sortedDays.length > 0 ? Math.max(...sortedDays.map(([_, v]) => v)) : 0;
    const largestLossDay = sortedDays.length > 0 ? Math.abs(Math.min(...sortedDays.map(([_, v]) => v))) : 0;

    // Streak parameters
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let curWin = 0;
    let curLoss = 0;

    sortedDays.forEach(([_, dayPnl]) => {
      if (dayPnl > 0) {
        curWin++;
        curLoss = 0;
        maxWinStreak = Math.max(maxWinStreak, curWin);
      } else if (dayPnl < 0) {
        curLoss++;
        curWin = 0;
        maxLossStreak = Math.max(maxLossStreak, curLoss);
      } else {
        curWin = 0;
        curLoss = 0;
      }
    });

    // Equity Curve Array
    let cumulative = 0;
    const equityCurveData = [{ day: '0', cumPnl: 0, dailyPnl: 0 }];
    sortedDays.forEach(([date, dayPnl]) => {
      cumulative += dayPnl;
      equityCurveData.push({
        day: new Date(date).getDate().toString(),
        cumPnl: parseFloat(cumulative.toFixed(2)),
        dailyPnl: parseFloat(dayPnl.toFixed(2))
      });
    });

    // Execution Status Frequency
    const execStatusCount: Record<string, number> = {
      'BEST TRADE': 0, 'GOOD TRADE': 0, 'AVERAGE TRADE': 0, 'POOR TRADE': 0, 'BAD TRADE': 0
    };
    trades.forEach((t) => {
      if (t.execution_status && t.execution_status in execStatusCount) {
        execStatusCount[t.execution_status]++;
      }
    });

    // Mistakes Breakdown
    const mistakeCount: Record<string, number> = {
      Technical: 0, Psychological: 0, 'Risk Management': 0, 'No Mistake': 0
    };
    trades.forEach((t) => {
      if (t.mistake_type && t.mistake_type in mistakeCount) {
        mistakeCount[t.mistake_type]++;
      }
    });

    // Subjective Indicators Scores
    const avgPsychScore = psychologyData.length > 0
      ? psychologyData.reduce((sum, p) => sum + (p.psychological_condition_pct || 0), 0) / psychologyData.length
      : 0;

    const avgRiskScore = riskData.length > 0
      ? riskData.reduce((sum, r) => sum + (r.followed_risk_rules_pct || 0), 0) / riskData.length
      : 0;

    const techByTrade: Record<string, { total: number; yes: number }> = {};
    rulesData.forEach((r) => {
      if (!techByTrade[r.trade_id]) {
        techByTrade[r.trade_id] = { total: 0, yes: 0 };
      }
      techByTrade[r.trade_id].total++;
      if (r.followed === true) {
        techByTrade[r.trade_id].yes++;
      }
    });

    const techScores = Object.values(techByTrade).map((t) => t.total > 0 ? (t.yes / t.total) * 100 : 0);
    const avgTechScore = techScores.length > 0
      ? techScores.reduce((a, b) => a + b, 0) / techScores.length
      : 0;

    const avgOverallScore = (avgTechScore + avgPsychScore + avgRiskScore) / 3;
    const winDaysPct = tradingDaysCount > 0 ? (winDays / tradingDaysCount) * 100 : 0;

    return {
      wins,
      losses,
      breakevens,
      totalTrades,
      totalPnl,
      winRate,
      avgR,
      totalRSum,
      profitFactor,
      avgWin,
      avgLoss,
      avgWinLossRatio,
      largestWinTrade,
      largestLossTrade,
      winDays,
      lossDays,
      beDays,
      tradingDaysCount,
      dntDays,
      largestProfitDay,
      largestLossDay,
      maxWinStreak,
      maxLossStreak,
      equityCurveData,
      execStatusCount,
      mistakeCount,
      avgPsychScore,
      avgRiskScore,
      avgTechScore,
      avgOverallScore,
      winDaysPct
    };
  }, [trades, psychologyData, riskData, rulesData, startDate, endDate]);

  const clickedDayTrades = useMemo(() => {
    if (!selectedCalendarDay) return [];
    return trades.filter((t) => t.date === selectedCalendarDay);
  }, [trades, selectedCalendarDay]);

  const clickedDayStats = useMemo(() => {
    const totalTrades = clickedDayTrades.length;
    const wins = clickedDayTrades.filter((t) => (t.pnl || 0) > 0);
    const losses = clickedDayTrades.filter((t) => (t.pnl || 0) < 0);
    const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 100) : 0;
    
    // GROSS P&L: sum of pnl + sum of fees for that day (before commissions)
    const grossPnl = clickedDayTrades.reduce((sum, t) => sum + (t.pnl || 0) + (t.fees || 0), 0);
    const commissions = clickedDayTrades.reduce((sum, t) => sum + (t.fees || 0), 0);
    const netPnl = clickedDayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    const winningPnlSum = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const losingPnlSum = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const profitFactor = losingPnlSum > 0 ? (winningPnlSum / losingPnlSum).toFixed(2) : '--';

    return {
      totalTrades,
      winners: wins.length,
      losers: losses.length,
      winRate,
      grossPnl,
      commissions,
      netPnl,
      profitFactor
    };
  }, [clickedDayTrades]);

  const balanceChartData = useMemo(() => {
    const startingBalance = startingBalanceInput || 0;
    
    // Group allHistoryTrades by date and sum pnl for each day
    const dailyPnl: Record<string, number> = {};
    allHistoryTrades.forEach((t) => {
      const d = t.date;
      if (d) {
        dailyPnl[d] = (dailyPnl[d] || 0) + (t.pnl || 0);
      }
    });

    const sortedDates = Object.keys(dailyPnl).sort((a, b) => a.localeCompare(b));

    const dataPoints = [{ date: 'Start', balance: startingBalance }];
    let currentBalance = startingBalance;
    
    sortedDates.forEach((dateStr) => {
      currentBalance += dailyPnl[dateStr];
      const dateObj = new Date(dateStr);
      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      dataPoints.push({
        date: formattedDate,
        balance: parseFloat(currentBalance.toFixed(2))
      });
    });

    const totalWinnerPnl = allHistoryTrades.filter(t => (t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLoserPnl = Math.abs(allHistoryTrades.filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0));

    return {
      startingBalance,
      dataPoints,
      currentBalance,
      totalWinnerPnl,
      totalLoserPnl
    };
  }, [allHistoryTrades, startingBalanceInput]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) return null;

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || accentColorState || '#06b6d4';
  const gridLineColor = getComputedStyle(document.documentElement).getPropertyValue('--bar').trim() || 'rgba(0,0,0,0.05)';
  const tickColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#a8a29e';

  const GREEN = '#008F67';
  const RED = '#DF1C30';

  // Determine chartColor based on final cumulative P&L
  const lastCurvePoint = stats.equityCurveData[stats.equityCurveData.length - 1];
  const finalPnl = lastCurvePoint ? lastCurvePoint.cumPnl : 0;
  const chartColor = finalPnl > 0 ? '#22c55e' : finalPnl < 0 ? '#ef4444' : '#94a3b8';

  const curveValues = stats.equityCurveData.map(d => d.cumPnl);
  const minVal = Math.min(...curveValues, 0);
  const maxVal = Math.max(...curveValues, 0);
  const range = maxVal - minVal;
  const zeroPercent = range > 0 ? (maxVal / range) * 100 : 0;

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
          <div className="max-w-7xl mx-auto p-0">
            {/* PAGE HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                  Dashboard
                </h1>
              </div>

              {/* DATE RANGE PICKER */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative" ref={headerDatePickerRef}>
                  {/* TRIGGER BUTTON */}
                  <button
                    onClick={() => setIsHeaderDatePickerOpen(!isHeaderDatePickerOpen)}
                    style={{
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--card)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      color: 'var(--text)',
                      cursor: 'pointer'
                    }}
                    className="flex items-center gap-2 hover:opacity-90 font-medium select-none"
                  >
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span>{formatDisplayDate(startDate)}</span>
                    <span className="text-zinc-400">→</span>
                    <span>{formatDisplayDate(endDate)}</span>
                    <ChevronDown className="w-3.5 h-3.5 ml-1 text-zinc-400" />
                  </button>

                  {/* DROPDOWN PANEL */}
                  {isHeaderDatePickerOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        zIndex: 1000,
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: '16px'
                      }}
                      className="select-none"
                    >
                      {/* LEFT CALENDAR COLUMN */}
                      <div className="flex flex-col" style={{ padding: '0', minWidth: '0', flex: 'none' }}>
                        <div className="flex items-center justify-between mb-3 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (headerPickerLeftMonth === 0) {
                                setHeaderPickerLeftYear((y) => y - 1);
                                setHeaderPickerLeftMonth(11);
                              } else {
                                setHeaderPickerLeftMonth((m) => m - 1);
                              }
                            }}
                            className="p-1 hover:bg-[var(--bar)] rounded-full text-zinc-400 hover:text-[var(--text)] cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          
                          <div className="flex items-center gap-1">
                            <select
                              value={headerPickerLeftMonth}
                              onChange={(e) => setHeaderPickerLeftMonth(Number(e.target.value))}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text)',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                appearance: 'auto',
                                outline: 'none'
                              }}
                            >
                              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => (
                                <option key={m} value={idx} style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>
                                  {m}
                                </option>
                              ))}
                            </select>

                            <select
                              value={headerPickerLeftYear}
                              onChange={(e) => setHeaderPickerLeftYear(Number(e.target.value))}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text)',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                appearance: 'auto',
                                outline: 'none'
                              }}
                            >
                              {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((yr) => (
                                <option key={yr} value={yr} style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>
                                  {yr}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (headerPickerLeftMonth === 11) {
                                setHeaderPickerLeftYear((y) => y + 1);
                                setHeaderPickerLeftMonth(0);
                              } else {
                                setHeaderPickerLeftMonth((m) => m + 1);
                              }
                            }}
                            className="p-1 hover:bg-[var(--bar)] rounded-full text-zinc-400 hover:text-[var(--text)] cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Weekday Row */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 30px)',
                            gap: '2px',
                            marginBottom: '4px'
                          }}
                          className="text-center"
                        >
                          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                            <span
                              key={day}
                              style={{
                                width: '30px',
                                textAlign: 'center',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--text-muted)'
                              }}
                            >
                              {day}
                            </span>
                          ))}
                        </div>

                        {/* Day Grid */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 30px)',
                            gap: '2px'
                          }}
                          className="text-center"
                        >
                          {(() => {
                            const y = headerPickerLeftYear;
                            const m = headerPickerLeftMonth;
                            const firstDay = new Date(y, m, 1).getDay();
                            const prevMonthNumDays = new Date(y, m, 0).getDate();
                            const numDays = new Date(y, m + 1, 0).getDate();

                            const days: { date: Date; isCurrentMonth: boolean }[] = [];

                            // Prev month days
                            for (let i = firstDay - 1; i >= 0; i--) {
                              days.push({
                                date: new Date(y, m - 1, prevMonthNumDays - i),
                                isCurrentMonth: false
                              });
                            }

                            // Current month days
                            for (let i = 1; i <= numDays; i++) {
                              days.push({
                                date: new Date(y, m, i),
                                isCurrentMonth: true
                              });
                            }

                            // Next month days
                            const remaining = 42 - days.length;
                            for (let i = 1; i <= remaining; i++) {
                              days.push({
                                date: new Date(y, m + 1, i),
                                isCurrentMonth: false
                              });
                            }

                            return days.map(({ date, isCurrentMonth }, idx) => {
                              const isToday = (() => {
                                  const today = new Date();
                                  return date.getDate() === today.getDate() &&
                                         date.getMonth() === today.getMonth() &&
                                         date.getFullYear() === today.getFullYear();
                                })();

                              const isSelectedStart = headerPickerTempStart &&
                                date.getDate() === headerPickerTempStart.getDate() &&
                                date.getMonth() === headerPickerTempStart.getMonth() &&
                                date.getFullYear() === headerPickerTempStart.getFullYear();

                              const isSelectedEnd = headerPickerTempEnd &&
                                date.getDate() === headerPickerTempEnd.getDate() &&
                                date.getMonth() === headerPickerTempEnd.getMonth() &&
                                date.getFullYear() === headerPickerTempEnd.getFullYear();

                              const isInRange = (() => {
                                if (headerPickerTempStart && headerPickerTempEnd) {
                                  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                  const s = new Date(headerPickerTempStart.getFullYear(), headerPickerTempStart.getMonth(), headerPickerTempStart.getDate());
                                  const e = new Date(headerPickerTempEnd.getFullYear(), headerPickerTempEnd.getMonth(), headerPickerTempEnd.getDate());
                                  return d > s && d < e;
                                }
                                if (headerPickerTempStart && headerPickerHoveredDate && isSelectingSecondDate) {
                                  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                  const s = new Date(headerPickerTempStart.getFullYear(), headerPickerTempStart.getMonth(), headerPickerTempStart.getDate());
                                  const h = new Date(headerPickerHoveredDate.getFullYear(), headerPickerHoveredDate.getMonth(), headerPickerHoveredDate.getDate());
                                  return d > s && d < h;
                                }
                                return false;
                              })();

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (!headerPickerTempStart || (headerPickerTempStart && headerPickerTempEnd)) {
                                      setHeaderPickerTempStart(date);
                                      setHeaderPickerTempEnd(null);
                                      setIsSelectingSecondDate(true);
                                    } else {
                                      if (date >= headerPickerTempStart) {
                                        setHeaderPickerTempEnd(date);
                                        setStartDate(formatLocalDate(headerPickerTempStart));
                                        setEndDate(formatLocalDate(date));
                                        setIsHeaderDatePickerOpen(false);
                                      } else {
                                        setHeaderPickerTempStart(date);
                                        setHeaderPickerTempEnd(null);
                                        setIsSelectingSecondDate(true);
                                      }
                                    }
                                  }}
                                  onMouseEnter={() => {
                                    if (isSelectingSecondDate) {
                                      setHeaderPickerHoveredDate(date);
                                    }
                                  }}
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: (isSelectedStart || isSelectedEnd) ? 600 : 400,
                                    borderRadius: (isSelectedStart || isSelectedEnd) ? '50%' : isInRange ? '0px' : '50%',
                                    backgroundColor: (isSelectedStart || isSelectedEnd)
                                      ? 'var(--accent)'
                                      : isInRange
                                        ? 'rgba(6, 182, 212, 0.12)'
                                        : 'transparent',
                                    color: (isSelectedStart || isSelectedEnd)
                                      ? '#ffffff'
                                      : isCurrentMonth
                                        ? 'var(--text)'
                                        : 'var(--text-muted)',
                                    opacity: isCurrentMonth ? 1 : 0.35,
                                    cursor: 'pointer'
                                  }}
                                  className="flex items-center justify-center relative hover:bg-[var(--bar)] hover:rounded-full group transition-all"
                                >
                                  <span>{date.getDate()}</span>
                                  {isToday && !isSelectedStart && !isSelectedEnd && (
                                    <span
                                      className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                                      style={{ backgroundColor: 'var(--accent)' }}
                                    />
                                  )}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* MIDDLE CALENDAR COLUMN */}
                      <div className="flex flex-col" style={{ padding: '0', minWidth: '0', flex: 'none' }}>
                        <div className="flex items-center justify-between mb-3 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (headerPickerRightMonth === 0) {
                                setHeaderPickerRightYear((y) => y - 1);
                                setHeaderPickerRightMonth(11);
                              } else {
                                setHeaderPickerRightMonth((m) => m - 1);
                              }
                            }}
                            className="p-1 hover:bg-[var(--bar)] rounded-full text-zinc-400 hover:text-[var(--text)] cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          
                          <div className="flex items-center gap-1">
                            <select
                              value={headerPickerRightMonth}
                              onChange={(e) => setHeaderPickerRightMonth(Number(e.target.value))}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text)',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                appearance: 'auto',
                                outline: 'none'
                              }}
                            >
                              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => (
                                <option key={m} value={idx} style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>
                                  {m}
                                </option>
                              ))}
                            </select>

                            <select
                              value={headerPickerRightYear}
                              onChange={(e) => setHeaderPickerRightYear(Number(e.target.value))}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text)',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                appearance: 'auto',
                                outline: 'none'
                              }}
                            >
                              {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((yr) => (
                                <option key={yr} value={yr} style={{ backgroundColor: 'var(--card)', color: 'var(--text)' }}>
                                  {yr}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (headerPickerRightMonth === 11) {
                                setHeaderPickerRightYear((y) => y + 1);
                                setHeaderPickerRightMonth(0);
                              } else {
                                setHeaderPickerRightMonth((m) => m + 1);
                              }
                            }}
                            className="p-1 hover:bg-[var(--bar)] rounded-full text-zinc-400 hover:text-[var(--text)] cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Weekday Row */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 30px)',
                            gap: '2px',
                            marginBottom: '4px'
                          }}
                          className="text-center"
                        >
                          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                            <span
                              key={day}
                              style={{
                                width: '30px',
                                textAlign: 'center',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--text-muted)'
                              }}
                            >
                              {day}
                            </span>
                          ))}
                        </div>

                        {/* Day Grid */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 30px)',
                            gap: '2px'
                          }}
                          className="text-center"
                        >
                          {(() => {
                            const y = headerPickerRightYear;
                            const m = headerPickerRightMonth;
                            const firstDay = new Date(y, m, 1).getDay();
                            const prevMonthNumDays = new Date(y, m, 0).getDate();
                            const numDays = new Date(y, m + 1, 0).getDate();

                            const days: { date: Date; isCurrentMonth: boolean }[] = [];

                            // Prev month days
                            for (let i = firstDay - 1; i >= 0; i--) {
                              days.push({
                                date: new Date(y, m - 1, prevMonthNumDays - i),
                                isCurrentMonth: false
                              });
                            }

                            // Current month days
                            for (let i = 1; i <= numDays; i++) {
                              days.push({
                                date: new Date(y, m, i),
                                isCurrentMonth: true
                              });
                            }

                            // Next month days
                            const remaining = 42 - days.length;
                            for (let i = 1; i <= remaining; i++) {
                              days.push({
                                date: new Date(y, m + 1, i),
                                isCurrentMonth: false
                              });
                            }

                            return days.map(({ date, isCurrentMonth }, idx) => {
                              const isToday = (() => {
                                  const today = new Date();
                                  return date.getDate() === today.getDate() &&
                                         date.getMonth() === today.getMonth() &&
                                         date.getFullYear() === today.getFullYear();
                                })();

                              const isSelectedStart = headerPickerTempStart &&
                                date.getDate() === headerPickerTempStart.getDate() &&
                                date.getMonth() === headerPickerTempStart.getMonth() &&
                                date.getFullYear() === headerPickerTempStart.getFullYear();

                              const isSelectedEnd = headerPickerTempEnd &&
                                date.getDate() === headerPickerTempEnd.getDate() &&
                                date.getMonth() === headerPickerTempEnd.getMonth() &&
                                date.getFullYear() === headerPickerTempEnd.getFullYear();

                              const isInRange = (() => {
                                if (headerPickerTempStart && headerPickerTempEnd) {
                                  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                  const s = new Date(headerPickerTempStart.getFullYear(), headerPickerTempStart.getMonth(), headerPickerTempStart.getDate());
                                  const e = new Date(headerPickerTempEnd.getFullYear(), headerPickerTempEnd.getMonth(), headerPickerTempEnd.getDate());
                                  return d > s && d < e;
                                }
                                if (headerPickerTempStart && headerPickerHoveredDate && isSelectingSecondDate) {
                                  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                  const s = new Date(headerPickerTempStart.getFullYear(), headerPickerTempStart.getMonth(), headerPickerTempStart.getDate());
                                  const h = new Date(headerPickerHoveredDate.getFullYear(), headerPickerHoveredDate.getMonth(), headerPickerHoveredDate.getDate());
                                  return d > s && d < h;
                                }
                                return false;
                              })();

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (!headerPickerTempStart || (headerPickerTempStart && headerPickerTempEnd)) {
                                      setHeaderPickerTempStart(date);
                                      setHeaderPickerTempEnd(null);
                                      setIsSelectingSecondDate(true);
                                    } else {
                                      if (date >= headerPickerTempStart) {
                                        setHeaderPickerTempEnd(date);
                                        setStartDate(formatLocalDate(headerPickerTempStart));
                                        setEndDate(formatLocalDate(date));
                                        setIsHeaderDatePickerOpen(false);
                                      } else {
                                        setHeaderPickerTempStart(date);
                                        setHeaderPickerTempEnd(null);
                                        setIsSelectingSecondDate(true);
                                      }
                                    }
                                  }}
                                  onMouseEnter={() => {
                                    if (isSelectingSecondDate) {
                                      setHeaderPickerHoveredDate(date);
                                    }
                                  }}
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: (isSelectedStart || isSelectedEnd) ? 600 : 400,
                                    borderRadius: (isSelectedStart || isSelectedEnd) ? '50%' : isInRange ? '0px' : '50%',
                                    backgroundColor: (isSelectedStart || isSelectedEnd)
                                      ? 'var(--accent)'
                                      : isInRange
                                        ? 'rgba(6, 182, 212, 0.12)'
                                        : 'transparent',
                                    color: (isSelectedStart || isSelectedEnd)
                                      ? '#ffffff'
                                      : isCurrentMonth
                                        ? 'var(--text)'
                                        : 'var(--text-muted)',
                                    opacity: isCurrentMonth ? 1 : 0.35,
                                    cursor: 'pointer'
                                  }}
                                  className="flex items-center justify-center relative hover:bg-[var(--bar)] hover:rounded-full group transition-all"
                                >
                                  <span>{date.getDate()}</span>
                                  {isToday && !isSelectedStart && !isSelectedEnd && (
                                    <span
                                      className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                                      style={{ backgroundColor: 'var(--accent)' }}
                                    />
                                  )}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* PRESET COLUMN */}
                      <div
                        style={{
                          padding: '0',
                          minWidth: '110px',
                          maxWidth: '130px',
                          borderLeft: '1px solid var(--border)',
                          paddingLeft: '16px'
                        }}
                        className="flex flex-col gap-1.5 justify-center"
                      >
                        {(() => {
                          const presets = [
                            'Today',
                            'This Week',
                            'This Month',
                            'Last 30 Days',
                            'Last Month',
                            'This Quarter',
                            'YTD'
                          ];

                          const handlePresetClick = (preset: string) => {
                            const today = new Date();
                            let start = new Date();
                            let end = new Date();

                            switch (preset) {
                              case 'Today':
                                start = today;
                                end = today;
                                break;
                              case 'This Week': {
                                const day = today.getDay();
                                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                                start = new Date(today.getFullYear(), today.getMonth(), diff);
                                end = today;
                                break;
                              }
                              case 'This Month':
                                start = new Date(today.getFullYear(), today.getMonth(), 1);
                                end = today;
                                break;
                              case 'Last 30 Days':
                                start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
                                end = today;
                                break;
                              case 'Last Month':
                                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                                end = new Date(today.getFullYear(), today.getMonth(), 0);
                                break;
                              case 'This Quarter': {
                                const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
                                start = new Date(today.getFullYear(), qStartMonth, 1);
                                end = today;
                                break;
                              }
                              case 'YTD':
                                start = new Date(today.getFullYear(), 0, 1);
                                end = today;
                                break;
                            }

                            const startStr = formatLocalDate(start);
                            const endStr = formatLocalDate(end);
                            setStartDate(startStr);
                            setEndDate(endStr);
                            setHeaderPickerTempStart(start);
                            setHeaderPickerTempEnd(end);
                            setIsHeaderDatePickerOpen(false);
                          };

                          const isPresetActive = (preset: string) => {
                            const today = new Date();
                            let start = new Date();
                            let end = new Date();

                            switch (preset) {
                              case 'Today':
                                start = today;
                                end = today;
                                break;
                              case 'This Week': {
                                const day = today.getDay();
                                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                                start = new Date(today.getFullYear(), today.getMonth(), diff);
                                end = today;
                                break;
                              }
                              case 'This Month':
                                start = new Date(today.getFullYear(), today.getMonth(), 1);
                                end = today;
                                break;
                              case 'Last 30 Days':
                                start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
                                end = today;
                                break;
                              case 'Last Month':
                                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                                end = new Date(today.getFullYear(), today.getMonth(), 0);
                                break;
                              case 'This Quarter': {
                                const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
                                start = new Date(today.getFullYear(), qStartMonth, 1);
                                end = today;
                                break;
                              }
                              case 'YTD':
                                start = new Date(today.getFullYear(), 0, 1);
                                end = today;
                                break;
                            }

                            return startDate === formatLocalDate(start) && endDate === formatLocalDate(end);
                          };

                          return presets.map((preset) => {
                            const active = isPresetActive(preset);
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handlePresetClick(preset)}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '6px 8px',
                                  fontSize: '13px',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  borderRadius: '6px',
                                  color: active ? 'var(--accent)' : 'var(--text-sub)',
                                  fontWeight: active ? 600 : 400
                                }}
                                className="hover:bg-[var(--bar)] hover:text-[var(--text)] transition-all select-none"
                              >
                                {preset}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* ASK AI BUTTON */}
                <button
                  id="dashboard-header-ask-ai"
                  onClick={() => navigate('/ai-teacher')}
                  style={{
                    backgroundColor: 'var(--accent-muted)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  className="shrink-0 transition-all hover:opacity-90 flex items-center justify-center font-sans"
                >
                  Ask AI
                </button>

                {/* OVERALL SCORE PILL */}
                {!loading && trades.length > 0 && (
                  <div
                    style={{
                      display: 'none',
                      backgroundColor: 'var(--accent-muted)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '6px 16px',
                      letterSpacing: '0.3px'
                    }}
                    className="shrink-0 flex items-center gap-1.5 font-mono uppercase tracking-wider shadow-md"
                  >
                    <Activity className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <span>YOUR SCORE: {stats.avgOverallScore.toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* NEW HORIZONTAL INFO BAR directly below page header and above KPI stat cards */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '8px 16px', 
                background: 'transparent',
                border: 'none',
                borderRadius: '0',
                boxShadow: 'none',
                marginTop: '10px',
                marginBottom: '10px',
                width: '100%'
              }}
              className="flex-wrap gap-4 items-center"
            >
              {/* Left side */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} className="flex items-center">
                {/* ELEMENT 1 — Bell icon with badge inside a box container */}
                <div 
                  style={{
                    backgroundColor: 'var(--bg, var(--bar))',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                  className="relative"
                >
                  <div className="relative">
                    <Bell className="w-5 h-5 text-zinc-500" style={{ color: 'var(--text-sub)' }} />
                    {needsReviewCount > 0 && (
                      <span 
                        className="absolute -top-2.5 -right-2.5 flex items-center justify-center bg-red-500 font-bold text-white shadow-sm"
                        style={{ 
                          backgroundColor: '#ef4444',
                          minWidth: '20px',
                          minHeight: '20px',
                          padding: '2px 5px',
                          fontSize: '10px',
                          borderRadius: '9999px',
                          lineHeight: 1
                        }}
                      >
                        {needsReviewCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* ELEMENT 2 — Account selector dropdown */}
                <div ref={dropdownRef} className="relative animate-fadeIn">
                  <button
                    onClick={() => setIsBrokerDropdownOpen(!isBrokerDropdownOpen)}
                    style={{
                      backgroundColor: 'var(--bg, var(--bar))',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text)',
                      padding: '6px 12px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                    className="hover:opacity-90 transition-all font-medium flex items-center"
                  >
                    {selectedBroker ? (
                      <>
                        <span className={`w-2 h-2 rounded-full inline-block ${selectedBroker.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <span className="font-mono">{getBrokerCode(selectedBroker)} {getAccountNumber(selectedBroker)}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full inline-block bg-red-500"></span>
                        <span className="font-mono">NO BROKERS</span>
                      </>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  </button>

                  {isBrokerDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '6px',
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 100,
                        minWidth: '200px',
                        padding: '6px 0'
                      }}
                    >
                      {brokerConnections.length === 0 ? (
                        <div className="px-4 py-2 text-xs text-[var(--text-muted)]" style={{ color: 'var(--text-muted)' }}>
                          No connected brokers
                        </div>
                      ) : (
                        brokerConnections.map((broker) => (
                          <button
                            key={broker.id}
                            onClick={() => {
                              setSelectedBroker(broker);
                              setIsBrokerDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-[rgba(0,0,0,0.03)] flex items-center gap-2 transition-all border-none"
                            style={{ color: 'var(--text)', cursor: 'pointer', backgroundColor: 'transparent', padding: '8px 16px' }}
                          >
                            <span className={`w-2 h-2 rounded-full inline-block ${broker.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            <span className="font-mono">{getBrokerCode(broker)} {getAccountNumber(broker)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right side */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }} className="flex items-center ml-auto flex-wrap sm:flex-nowrap">
                {/* ELEMENT 3 — Last synced time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-sub)' }} className="text-xs">
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Last synced: <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>{lastSyncedTime}</span></span>
                </div>

                {/* ELEMENT 5 — Import Trades button */}
                <button
                  onClick={() => navigate('/trade-entry')}
                  style={{
                    border: '1.5px solid var(--accent)',
                    color: 'var(--accent)',
                    backgroundColor: 'transparent',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  className="hover:bg-[var(--accent-muted)] transition-all font-sans shrink-0"
                >
                  + Import Trades
                </button>
              </div>
            </div>

            {/* SKELETON LOADER STATE */}
            {loading ? (
              <div className="space-y-6">
                {/* Loader 1: Key Stats Strip as 4 Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '10px' }} className="p-4 h-24 relative overflow-hidden flex flex-col justify-between">
                      <div className="h-3 w-16 skeleton" style={{ borderRadius: '4px' }} />
                      <div className="h-6 w-24 skeleton" style={{ borderRadius: '4px' }} />
                      <div className="h-3 w-20 skeleton" style={{ borderRadius: '4px' }} />
                    </div>
                  ))}
                </div>

                {/* Loader 2: Equity Curve */}
                <div style={{ backgroundColor: 'var(--bar)', borderRadius: '12px' }} className="p-5 h-[340px] relative overflow-hidden flex flex-col justify-between">
                  <div className="flex justify-between mb-4">
                    <div className="h-4 w-36 skeleton" style={{ borderRadius: '4px' }} />
                    <div className="h-4 w-24 skeleton" style={{ borderRadius: '4px' }} />
                  </div>
                  <div className="w-full h-[250px] skeleton" style={{ borderRadius: '12px' }} />
                </div>

                {/* Loader 3: Donut cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} style={{ backgroundColor: 'var(--bar)', borderRadius: '12px' }} className="p-4 h-[280px] flex flex-col justify-between relative overflow-hidden">
                      <div className="h-4 w-24 skeleton" style={{ borderRadius: '4px' }} />
                      <div className="w-28 h-28 rounded-full skeleton mx-auto" />
                      <div className="h-3 w-32 skeleton mx-auto" style={{ borderRadius: '4px' }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : trades.length === 0 ? (
              /* EMPTY PERFORMANCE STATE */
              <div className="rounded-2xl p-12 text-center flex flex-col items-center justify-center py-20 shadow-xl" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                  <BarChart2 className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold tracking-tight font-display" style={{ color: 'var(--text)' }}>
                  No trades in selected period
                </h3>
                <p className="text-xs mt-1.5 max-w-sm" style={{ color: 'var(--text-sub)' }}>
                  Log trades to populate performance graphs, metrics radar, streaks analytics, and execution values.
                </p>
                <button
                  onClick={() => navigate('/trade-entry')}
                  className="mt-6 hover:opacity-90 text-white font-extrabold rounded-xl px-5 py-3 text-xs uppercase tracking-wider font-mono transition-all shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Log a Trade
                </button>
              </div>
            ) : (
              /* ACTIVE DASHBOARD RENDER OUT */
              <div className="space-y-5">
                {/* SECTION 2: KEY STATS ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3" style={{ marginBottom: '16px' }}>
                  {/* Card 1 — NET P&L */}
                  <div 
                    style={{ 
                      height: '105px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid rgba(0, 0, 0, 0.06)', 
                      borderRadius: '12px', 
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
                      padding: '8px 14px'
                    }}
                  >
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      NET P&L
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, paddingTop: '10px' }}>
                      <div className="font-sans" style={{ fontSize: '24px', fontWeight: 500, color: stats.totalPnl > 0 ? '#008F67' : stats.totalPnl < 0 ? '#DF1C30' : 'var(--text)', lineHeight: '1.2' }}>
                        {formatPnlNoDecimals(stats.totalPnl)}
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-sub)', fontSize: '11px', fontWeight: 400 }}>
                      {stats.totalTrades}
                    </div>
                  </div>

                  {/* Card 2 — TRADE WIN % */}
                  <div 
                    style={{ 
                      height: '105px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid rgba(0, 0, 0, 0.06)', 
                      borderRadius: '12px', 
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
                      padding: '8px 14px'
                    }}
                  >
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      TRADE WIN %
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexGrow: 1 }}>
                      <div className="font-sans" style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text)', lineHeight: '1.1' }}>
                        {stats.winRate.toFixed(2)}%
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SemicircleGauge percentage={stats.winRate} wCount={stats.wins.length} beCount={stats.breakevens.length} lCount={stats.losses.length} />
                      </div>
                    </div>
                  </div>

                  {/* Card 3 — PROFIT FACTOR */}
                  <div 
                    style={{ 
                      height: '105px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid rgba(0, 0, 0, 0.06)', 
                      borderRadius: '12px', 
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
                      padding: '8px 14px'
                    }}
                  >
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      PROFIT FACTOR
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexGrow: 1 }}>
                      <div className="font-sans" style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text)', lineHeight: '1.1' }}>
                        {stats.profitFactor === 999 ? '∞' : stats.profitFactor.toFixed(2)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircleGauge value={stats.profitFactor} />
                      </div>
                    </div>
                  </div>

                  {/* Card 4 — DAY WIN % */}
                  <div 
                    style={{ 
                      height: '105px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid rgba(0, 0, 0, 0.06)', 
                      borderRadius: '12px', 
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
                      padding: '8px 14px'
                    }}
                  >
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      DAY WIN %
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexGrow: 1 }}>
                      <div className="font-sans" style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text)', lineHeight: '1.1' }}>
                        {stats.winDaysPct.toFixed(2)}%
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SemicircleGauge percentage={stats.winDaysPct} wCount={stats.winDays} beCount={stats.beDays} lCount={stats.lossDays} isDayWin={true} />
                      </div>
                    </div>
                  </div>

                  {/* Card 5 — AVG WIN/LOSS TRADE */}
                  <div 
                    style={{ 
                      height: '105px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid rgba(0, 0, 0, 0.06)', 
                      borderRadius: '12px', 
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
                      padding: '8px 14px'
                    }}
                  >
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      AVG WIN/LOSS TRADE
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexGrow: 1 }}>
                      <div className="font-sans" style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text)', lineHeight: '1.2' }}>
                        {stats.avgWinLossRatio === 999 ? '∞' : stats.avgWinLossRatio.toFixed(2)}:1
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} className="flex-grow max-w-[100px]">
                        {(() => {
                          const avgWinForBar = stats.avgWin || 0;
                          const avgLossForBar = stats.avgLoss || 0;
                          const totalForBar = avgWinForBar + Math.abs(avgLossForBar);
                          const winPctForBar = totalForBar > 0 ? (avgWinForBar / totalForBar) * 100 : 50;
                          return (
                            <>
                              <div style={{ display: 'flex', height: '7px', width: '100%', borderRadius: '0px', overflow: 'hidden' }}>
                                <div style={{ width: `${winPctForBar}%`, backgroundColor: '#008F67' }} />
                                <div style={{ width: `${100 - winPctForBar}%`, backgroundColor: '#DF1C30' }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 500 }} className="font-mono">
                                <span style={{ color: '#008F67' }}>₹{Math.round(avgWinForBar).toLocaleString('en-IN')}</span>
                                <span style={{ color: '#DF1C30' }}>₹{Math.round(avgLossForBar).toLocaleString('en-IN')}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* NEW 3-COLUMN ROW: Trading Metrics | Cumulative P&L | Daily P&L */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'stretch' }} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                  {/* Column 1: Trading Metrics */}
                  <div className="rounded-xl px-5 pb-5 pt-2.5" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', height: '300px', position: 'relative', overflow: 'hidden' }}>
                    <style>{`
                      .trading-metrics-radar .recharts-polar-grid-angle line {
                        stroke-width: 1 !important;
                        stroke-opacity: 0.3 !important;
                      }
                    `}</style>
                    <div style={{ position: 'absolute', top: '8px', left: '16px', zIndex: 1, margin: 0, textAlign: 'left', width: 'calc(100% - 32px)', paddingTop: '0px', borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: '4px', marginBottom: '8px' }}>
                      <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Trading Metrics
                      </h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)', display: 'none' }}>
                        Monthly averages across all trades
                      </p>
                    </div>

                    {/* CHART & SCORE WRAPPER CENTRED IN FULL CARD */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      {/* RADAR RECHARTS */}
                      <div
                        className="w-full flex items-center justify-center mt-2 trading-metrics-radar"
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ width: '100%', height: '220px', marginTop: '24px', outline: 'none', userSelect: 'none' }}
                      >
                        <ResponsiveContainer width="100%" height={220} style={{ marginTop: "35px" }}>
                          <RadarChart
                            cx="50%"
                            cy="50%"
                            outerRadius="88%"
                            width={420}
                            height={220}
                            data={[
                              { metric: 'Technical', score: parseFloat(stats.avgTechScore.toFixed(1)) },
                              { metric: 'Psychology', score: parseFloat(stats.avgPsychScore.toFixed(1)) },
                              { metric: 'Risk Mgmt', score: parseFloat(stats.avgRiskScore.toFixed(1)) }
                            ]}
                          >
                            <PolarGrid
                              gridType="polygon"
                              stroke="var(--accent)"
                              strokeOpacity={0.15}
                              strokeWidth={10}
                              strokeLinecap="round"
                              style={{ strokeLinejoin: 'round' }}
                              fill="var(--accent)"
                              fillOpacity={0.06}
                            />
                            <PolarAngleAxis
                              dataKey="metric"
                              tick={{ fill: 'var(--text-sub)', fontSize: 11, fontFamily: 'Inter' }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tick={false}
                              axisLine={false}
                              tickCount={3}
                            />
                            <Radar
                              name="Avg Score"
                              dataKey="score"
                              stroke="var(--accent)"
                              fill="var(--accent)"
                              fillOpacity={0.12}
                              strokeWidth={2}
                              strokeOpacity={1}
                              dot={{
                                r: 4,
                                fill: 'var(--accent)',
                                stroke: 'var(--accent)',
                                strokeWidth: 1
                              }}
                            />
                            <RechartsTooltip content={<RadarTooltip />} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* SCORE PROGRESS BARS (HIDDEN) */}
                      <div className="mt-4 space-y-3" style={{ display: 'none' }}>
                        {/* TECHNICAL */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Technical (Rules)</span>
                            <span className="text-xs font-mono font-bold" style={{ color: getPercentTextColor(stats.avgTechScore) }}>
                              {stats.avgTechScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgTechScore}%`, backgroundColor: 'var(--accent)' }}
                            />
                          </div>
                        </div>

                        {/* PSYCHOLOGY */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Psychology</span>
                            <span className="text-xs font-mono font-bold" style={{ color: getPercentTextColor(stats.avgPsychScore) }}>
                              {stats.avgPsychScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgPsychScore}%`, backgroundColor: 'var(--accent)' }}
                            />
                          </div>
                        </div>

                        {/* RISK MANAGEMENT */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Risk Management</span>
                            <span className="text-xs font-mono font-bold" style={{ color: getPercentTextColor(stats.avgRiskScore) }}>
                              {stats.avgRiskScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgRiskScore}%`, backgroundColor: 'var(--accent)' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* OVERALL SUMMARY CENTER */}
                      <div style={{ flexShrink: 0, padding: '4px 0', textAlign: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your Score: </span>
                        <span className="animate-pulse" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
                          {stats.avgOverallScore.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Cumulative P&L */}
                  <div className="px-5 pb-5 pt-2.5 flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0, 0, 0, 0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)', overflow: 'visible', height: '300px' }}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: '4px', marginBottom: '8px', paddingTop: '0px' }}>
                      <div className="flex flex-col">
                        <h2 className="flex items-center gap-1.5" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px' }}>
                          <TrendingUp className="w-4 h-4" style={{ color: chartColor }} />
                          Cumulative P&L
                        </h2>
                        <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-sub)', marginLeft: '26px', display: 'none' }} className="mt-0.5">
                          {startDate} to {endDate}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-extrabold text-sm ${
                          stats.totalPnl > 0
                            ? 'text-[#22c55e]'
                            : stats.totalPnl < 0
                            ? 'text-[#ef4444]'
                            : ''
                        }`}
                        style={{ display: 'none', color: stats.totalPnl === 0 ? 'var(--text-sub)' : undefined }}
                      >
                        {formatINR(stats.totalPnl)}
                      </span>
                    </div>

                    <div
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      style={{ width: '100%', height: 260, outline: 'none', userSelect: 'none' }}
                    >
                      {(() => {
                        const data = stats.equityCurveData.map(d => ({
                          day: d.day,
                          pnl: d.cumPnl
                        }));
                        const maxVal = Math.max(...data.map(d => d.pnl), 0);
                        const minVal = Math.min(...data.map(d => d.pnl), 0);
                        const totalRange = maxVal - minVal;
                        const zeroPercent = totalRange > 0 ? (maxVal / totalRange) * 100 : 100;

                        return (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={data}
                              margin={{ top: 6, right: 6, bottom: 0, left: 4 }}
                            >
                              <defs>
                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.55} />
                                  <stop offset={`${zeroPercent}%`} stopColor={GREEN} stopOpacity={0.02} />
                                  <stop offset={`${zeroPercent}%`} stopColor={RED} stopOpacity={0.02} />
                                  <stop offset="100%" stopColor={RED} stopOpacity={0.55} />
                                </linearGradient>

                                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={GREEN} stopOpacity={1} />
                                  <stop offset={`${zeroPercent}%`} stopColor={GREEN} stopOpacity={1} />
                                  <stop offset={`${zeroPercent}%`} stopColor={RED} stopOpacity={1} />
                                  <stop offset="100%" stopColor={RED} stopOpacity={1} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                horizontal={true}
                                vertical={false}
                                stroke="rgba(0, 0, 0, 0.06)"
                                strokeDasharray="3 4"
                              />
                              <XAxis
                                dataKey="day"
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={{ stroke: 'var(--border)' }}
                                height={20}
                                tickMargin={4}
                                padding={{ left: 4, right: 4 }}
                              />
                              <YAxis
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => {
                                  if (v === 0) return '₹0';
                                  if (Math.abs(v) >= 1000) return `₹${(v/1000).toFixed(1)}K`;
                                  return `₹${v}`;
                                }}
                                tickCount={8}
                                domain={['auto', 'auto']}
                                width={52}
                                tickMargin={6}
                              />
                              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                              <RechartsTooltip
                                cursor={{ stroke: 'rgba(0,0,0,0.06)', strokeWidth: 1 }}
                                content={({ active, payload }) => {
                                  if (!active || !payload?.length) return null;
                                  const val = payload[0]?.value as number;
                                  const isPos = val >= 0;
                                  return (
                                    <div 
                                      className="px-2.5 py-1.5 text-xs font-semibold rounded-md border shadow-sm"
                                      style={{
                                        backgroundColor: 'var(--card)',
                                        borderColor: 'var(--border)',
                                        color: isPos ? GREEN : RED
                                      }}
                                    >
                                      {isPos ? `+₹${val.toLocaleString('en-IN')}` : `-₹${Math.abs(val).toLocaleString('en-IN')}`}
                                    </div>
                                  );
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="pnl"
                                stroke="url(#lineGradient)"
                                strokeWidth={1.5}
                                fill="url(#areaGradient)"
                                dot={false}
                                baseValue={0}
                                activeDot={(props: any) => {
                                  if (!props) return null;
                                  const { cx, cy, payload } = props;
                                  if (cx === undefined || cy === undefined) return null;
                                  const val = payload?.pnl ?? 0;
                                  const isPos = val >= 0;
                                  const dotColor = isPos ? '#008F67' : '#DF1C30';
                                  return (
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={3}
                                      fill={dotColor}
                                      stroke={dotColor}
                                      strokeWidth={1}
                                    />
                                  );
                                }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Column 3: Daily P&L */}
                  <div className="px-5 pb-5 pt-2.5 flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(0, 0, 0, 0.06)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)', height: '300px' }}>
                    <div className="flex items-center justify-between gap-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: '4px', marginBottom: '8px', paddingTop: '0px' }}>
                      <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Daily P&L
                      </h2>
                    </div>

                    <div
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      style={{ width: '100%', height: 260, outline: 'none', userSelect: 'none' }}
                    >
                      {(() => {
                        const data = stats.equityCurveData.filter(d => d.day !== '0').map(d => ({
                          day: d.day,
                          pnl: d.dailyPnl
                        }));
                        const filteredData = data.filter(d => d.pnl !== 0 && d.pnl != null);
                        return (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={filteredData}
                              margin={{ top: 6, right: 6, bottom: 0, left: 4 }}
                              barCategoryGap="50%"
                              barSize={14}
                            >
                              <CartesianGrid
                                horizontal={true}
                                vertical={false}
                                stroke="rgba(0, 0, 0, 0.06)"
                                strokeDasharray="3 4"
                              />
                              <XAxis
                                dataKey="day"
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={{ stroke: 'var(--border)' }}
                                height={20}
                                tickMargin={4}
                                padding={{ left: 4, right: 4 }}
                              />
                              <YAxis
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => {
                                  if (v === 0) return '₹0';
                                  if (Math.abs(v) >= 1000) return `₹${(v/1000).toFixed(1)}K`;
                                  return `₹${v}`;
                                }}
                                tickCount={8}
                                domain={['auto', 'auto']}
                                width={52}
                                tickMargin={6}
                              />
                              <RechartsTooltip
                                cursor={false}
                                content={({ active, payload }) => {
                                  if (!active || !payload?.length) return null;
                                  const val = payload[0]?.value as number;
                                  const isPos = val >= 0;
                                  return (
                                    <div 
                                      className="px-2.5 py-1.5 text-xs font-semibold rounded-md border shadow-sm"
                                      style={{
                                        backgroundColor: 'var(--card)',
                                        borderColor: 'var(--border)',
                                        color: isPos ? GREEN : RED
                                      }}
                                    >
                                      {isPos ? `+₹${val.toLocaleString('en-IN')}` : `-₹${Math.abs(val).toLocaleString('en-IN')}`}
                                    </div>
                                  );
                                }}
                              />
                              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                              <Bar dataKey="pnl">
                                {filteredData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.pnl >= 0 ? '#008F67' : '#DF1C30'}
                                    fillOpacity={0.9}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* SECTION 4: SIX DONUT CHARTS */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4" style={{ display: 'none' }}>
                  {/* DONUT 1: TRADING DAYS */}
                  <DonutChart
                    title="Trading Days"
                    data={[
                      { name: 'Win Days', value: stats.winDays, color: '#22C55E' },
                      { name: 'Loss Days', value: stats.lossDays, color: '#EF4444' },
                      { name: 'Did Not Trade', value: stats.dntDays, color: '#374151' }
                    ]}
                    centerPrimary={`${stats.tradingDaysCount}`}
                    centerSecondary="Days Traded"
                  />

                  {/* DONUT 2: WIN RATE */}
                  <DonutChart
                    title="Win Rate"
                    data={[
                      { name: 'Win', value: stats.wins.length, color: '#22C55E' },
                      { name: 'Loss', value: stats.losses.length, color: '#EF4444' },
                      { name: 'Breakeven', value: stats.breakevens.length, color: '#6B7280' }
                    ]}
                    centerPrimary={
                      <span className={getScoreColorClass(stats.winRate)}>
                        {stats.winRate.toFixed(0)}%
                      </span>
                    }
                    centerSecondary="Win Rate"
                  />

                  {/* DONUT 3: EXECUTION QUALITY */}
                  <DonutChart
                    title="Execution Quality"
                    data={[
                      { name: 'Best', value: stats.execStatusCount['BEST TRADE'], color: '#22C55E' },
                      { name: 'Good', value: stats.execStatusCount['GOOD TRADE'], color: '#14B8A6' },
                      { name: 'Average', value: stats.execStatusCount['AVERAGE TRADE'], color: '#EAB308' },
                      { name: 'Poor', value: stats.execStatusCount['POOR TRADE'], color: '#F97316' },
                      { name: 'Bad', value: stats.execStatusCount['BAD TRADE'], color: '#EF4444' }
                    ].filter(d => d.value > 0)}
                    centerPrimary={`${stats.execStatusCount['BEST TRADE'] + stats.execStatusCount['GOOD TRADE']}`}
                    centerSecondary="Best/Good"
                  />

                  {/* DONUT 4: AVG TRADE SIZE */}
                  <DonutChart
                    title="Avg Trade Size"
                    data={[
                      { name: 'Avg Win', value: parseFloat(stats.avgWin.toFixed(2)), color: '#22C55E' },
                      { name: 'Avg Loss', value: parseFloat(stats.avgLoss.toFixed(2)), color: '#EF4444' }
                    ]}
                    centerPrimary={`${stats.avgWinLossRatio === 999 ? '∞' : stats.avgWinLossRatio.toFixed(1)}:1`}
                    centerSecondary="W:L Ratio"
                  />

                  {/* DONUT 5: LARGEST TRADES */}
                  <DonutChart
                    title="Largest Trades"
                    data={[
                      { name: 'Best Trade', value: parseFloat(stats.largestWinTrade.toFixed(2)), color: '#22C55E' },
                      { name: 'Worst Trade', value: parseFloat(stats.largestLossTrade.toFixed(2)), color: '#EF4444' }
                    ]}
                    centerPrimary={
                      <div className="flex flex-col items-center">
                        <span className="text-[12px] font-bold text-green-400 font-mono">
                          +{stats.largestWinTrade > 0 ? (stats.largestWinTrade / 1000).toFixed(1) + 'k' : '—'}
                        </span>
                        <span className="text-[11px] font-bold text-red-400 font-mono mt-0.5">
                          -{stats.largestLossTrade > 0 ? (stats.largestLossTrade / 1000).toFixed(1) + 'k' : '—'}
                        </span>
                      </div>
                    }
                    centerSecondary="Best vs Worst"
                  />

                  {/* DONUT 6: MISTAKES BREAKDOWN */}
                  <DonutChart
                    title="Mistakes"
                    data={[
                      { name: 'Technical', value: stats.mistakeCount.Technical, color: '#6366F1' },
                      { name: 'Psychological', value: stats.mistakeCount.Psychological, color: '#A855F7' },
                      { name: 'Risk Mgmt', value: stats.mistakeCount['Risk Management'], color: '#14B8A6' },
                      { name: 'No Mistake', value: stats.mistakeCount['No Mistake'], color: '#22C55E' }
                    ].filter(d => d.value > 0)}
                    centerPrimary={
                      <span className={stats.mistakeCount.Technical + stats.mistakeCount.Psychological + stats.mistakeCount['Risk Management'] === 0 ? 'text-green-400' : 'text-amber-500'}>
                        {stats.mistakeCount.Technical + stats.mistakeCount.Psychological + stats.mistakeCount['Risk Management']}
                      </span>
                    }
                    centerSecondary="Mistakes Recorded"
                  />
                </div>

                {/* NEW 2-COLUMN ROW: Dhan Live + Recent Trades (Left 1/3) & Monthly Calendar (Right 2/3) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'stretch' }} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                  {/* Left Column (33%): Tabbed Info Card */}
                  <div className="rounded-xl px-5 pb-5 pt-0 flex flex-col justify-between lg:col-span-1" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', gridColumn: 'span 1' }}>
                    <div>
                      {/* Tab Bar */}
                      <div className="flex gap-4 border-b pb-2 mb-4" style={{ borderColor: 'var(--border)', paddingTop: '0px', marginTop: '0px' }}>
                        <button
                          onClick={() => setBottomTab('positions')}
                          style={{
                            color: bottomTab === 'positions' ? 'var(--accent)' : 'var(--text-muted)',
                            borderBottom: bottomTab === 'positions' ? '2px solid var(--accent)' : '2px solid transparent',
                            background: 'transparent',
                            fontWeight: bottomTab === 'positions' ? 600 : 400,
                            cursor: 'pointer'
                          }}
                          className="px-4 py-1.5 text-sm transition-all relative -bottom-[10px]"
                        >
                          Open Positions
                        </button>
                        <button
                          onClick={() => setBottomTab('trades')}
                          style={{
                            color: bottomTab === 'trades' ? 'var(--accent)' : 'var(--text-muted)',
                            borderBottom: bottomTab === 'trades' ? '2px solid var(--accent)' : '2px solid transparent',
                            background: 'transparent',
                            fontWeight: bottomTab === 'trades' ? 600 : 400,
                            cursor: 'pointer'
                          }}
                          className="px-4 py-1.5 text-sm transition-all relative -bottom-[10px]"
                        >
                          Recent Trades
                        </button>
                      </div>

                      {/* Tab Content 1: Open Positions */}
                      {bottomTab === 'positions' && (
                        <div>
                          {fetchingPositions ? (
                            <div className="flex justify-center items-center py-6">
                              <div className="animate-spin w-5 h-5 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
                            </div>
                          ) : (!hasDhanConnection || dhanPositions.length === 0) ? (
                            <div className="text-center py-8 border border-dashed border-[var(--border)] rounded-xl bg-[var(--bar)]">
                              <p className="text-xs text-[var(--text-sub)]">No active open positions in Dhan.</p>
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Real-time background position tracker is running.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                                    <th className="pb-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Symbol</th>
                                    <th className="pb-3 font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-muted)' }}>Direction</th>
                                    <th className="pb-3 font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-muted)' }}>Product</th>
                                    <th className="pb-3 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-muted)' }}>Qty</th>
                                    <th className="pb-3 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-muted)' }}>Avg. Price</th>
                                    <th className="pb-3 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-muted)' }}>Total Cost</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                                  {dhanPositions.map((pos: any) => (
                                    <tr
                                      key={pos.id}
                                      className="transition-colors hover:bg-[var(--row)]"
                                    >
                                      <td className="py-3 font-bold" style={{ color: 'var(--text)' }}>
                                        <div className="flex flex-col">
                                          <span>{pos.symbol}</span>
                                          <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono font-medium">
                                            {pos.exchange || 'NSE'} • {pos.instrument_type || 'EQUITY'}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${pos.opening_direction === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                          {pos.opening_direction}
                                        </span>
                                      </td>
                                      <td className="py-3 text-center font-semibold text-[var(--text-sub)] uppercase text-[10px]">
                                        {pos.product_type}
                                      </td>
                                      <td className="py-3 text-right font-mono font-bold text-[var(--text)]">
                                        {pos.total_quantity}
                                      </td>
                                      <td className="py-3 text-right font-mono text-[var(--text)]">
                                        {formatINR(pos.avg_entry_price)}
                                      </td>
                                      <td className="py-3 text-right font-mono font-bold text-[var(--text)]">
                                        {formatINR(pos.total_investment)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab Content 2: Recent Trades */}
                      {bottomTab === 'trades' && (
                        <div>
                          {trades.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No logged trades found for this period.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr style={{ background: 'rgba(0, 0, 0, 0.04)', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                    <th className="p-3 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Date</th>
                                    <th className="p-3 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Symbol</th>
                                    <th className="p-3 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Type</th>
                                    <th className="p-3 text-right" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>P&L</th>
                                  </tr>
                                </thead>
                                <tbody style={{ borderColor: 'var(--border)' }}>
                                  {trades.slice().reverse().slice(0, 5).map((trade: any, index: number) => {
                                    const isEven = index % 2 === 1;
                                    const isLong = trade.direction === 'LONG' || trade.direction === 'BUY';
                                    return (
                                      <tr
                                        key={trade.id}
                                        className="transition-colors duration-120"
                                        style={{
                                          cursor: 'pointer',
                                          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                                          backgroundColor: isEven ? 'rgba(0, 0, 0, 0.018)' : 'transparent'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.025)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isEven ? 'rgba(0, 0, 0, 0.018)' : 'transparent')}
                                      >
                                        <td className="p-3 font-mono" style={{ color: 'var(--text)' }}>
                                          {trade.trade_date ? new Date(trade.trade_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                        </td>
                                        <td className="p-3 font-bold" style={{ fontWeight: 600, color: 'var(--text)' }}>
                                          {trade.symbol}
                                        </td>
                                        <td className="p-3 font-sans">
                                          <span 
                                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                                            style={{
                                              backgroundColor: isLong ? '#dcfce7' : '#fee2e2',
                                              color: isLong ? '#16a34a' : '#dc2626'
                                            }}
                                          >
                                            {trade.direction}
                                          </span>
                                        </td>
                                        <td className={`p-3 font-mono font-bold text-right ${trade.pnl > 0 ? 'text-[#22c55e]' : trade.pnl < 0 ? 'text-[#ef4444]' : ''}`} style={{ color: trade.pnl === 0 ? 'var(--text-sub)' : undefined }}>
                                          {formatINR(trade.pnl)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (2/3): Monthly Calendar */}
                  {/* ADDITION 4 — Monthly Calendar section */}
                  <div className="rounded-xl px-5 pb-5 pt-2.5 lg:col-span-2" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', minWidth: '0px', overflow: 'hidden', boxSizing: 'border-box', gridColumn: 'span 2' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ paddingTop: '0px', paddingBottom: '4px', borderBottom: '1px solid rgba(0,0,0,0.07)', marginBottom: '8px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-muted)' }}>
                        Monthly Calendar
                      </h2>
                      
                      {/* Navigation */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={prevMonth}
                          style={{
                            backgroundColor: 'var(--bar)',
                            border: '0.5px solid var(--border)',
                            borderRadius: '6px',
                            color: 'var(--text)',
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}
                          className="hover:opacity-85 text-xs font-bold"
                        >
                          &larr;
                        </button>
                        <span className="font-semibold text-sm min-w-[120px] text-center" style={{ color: 'var(--text)' }}>
                          {CALENDAR_MONTH_NAMES[calMonth]} {calYear}
                        </span>
                        <button
                          onClick={nextMonth}
                          style={{
                            backgroundColor: 'var(--bar)',
                            border: '0.5px solid var(--border)',
                            borderRadius: '6px',
                            color: 'var(--text)',
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}
                          className="hover:opacity-85 text-xs font-bold"
                        >
                          &rarr;
                        </button>
                      </div>
                    </div>
 
                    <div className="overflow-x-auto flex-1 flex items-center justify-center">
                      <div style={{ width: '100%', minWidth: '0px', overflow: 'hidden', boxSizing: 'border-box' }} className="mx-auto select-none">
                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-1 mb-1" style={{ width: '100%', minWidth: '0px', overflow: 'hidden', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div
                              key={day}
                              style={{ 
                                width: '100%', 
                                minWidth: '0px', 
                                overflow: 'hidden', 
                                boxSizing: 'border-box', 
                                color: 'var(--text-muted)',
                                backgroundColor: 'var(--bg-secondary, var(--card-bg, var(--bg)))',
                                padding: '8px 0',
                                textAlign: 'center',
                                borderRadius: '4px'
                              }}
                              className="text-center text-[10px] uppercase font-bold tracking-wider"
                            >
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-1" style={{ width: '100%', minWidth: '0px', overflow: 'hidden', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                          {/* Empty prefix cells */}
                          {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, index) => (
                            <div
                              key={`empty-${index}`}
                              style={{ width: '100%', minWidth: '0px', overflow: 'hidden', boxSizing: 'border-box', height: '60px', backgroundColor: 'transparent', borderColor: 'transparent' }}
                              className="border"
                            />
                          ))}

                          {/* Active cells of the month */}
                          {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, index) => {
                            const d = index + 1;
                            const cellDateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const tradesOnDay = trades.filter((t) => t.date === cellDateStr);
                            const hasTrades = tradesOnDay.length > 0;
                            const dayPnl = tradesOnDay.reduce((sum, t) => sum + (t.pnl || 0), 0);
                            const tradeCount = tradesOnDay.length;
                            const isProfitable = hasTrades && dayPnl > 0;
                            const formattedDayPnl = dayPnl >= 0 
                              ? `₹${Math.round(dayPnl).toLocaleString('en-IN')}` 
                              : `-₹${Math.round(Math.abs(dayPnl)).toLocaleString('en-IN')}`;

                            return (
                              <div
                                key={`day-${d}`}
                                onClick={() => {
                                  if (hasTrades) {
                                    setSelectedCalendarDay(cellDateStr);
                                    setIsDayModalOpen(true);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  minWidth: '0px',
                                  overflow: 'hidden',
                                  boxSizing: 'border-box',
                                  height: '60px',
                                  backgroundColor: hasTrades 
                                    ? (isProfitable ? 'rgba(0, 143, 103, 0.12)' : 'rgba(223, 28, 48, 0.12)')
                                    : 'var(--card)',
                                  borderColor: 'var(--border)',
                                  cursor: hasTrades ? 'pointer' : 'default'
                                }}
                                className="border rounded flex flex-col justify-between p-1.5 transition-all hover:brightness-95"
                              >
                                <div className="flex justify-between items-start">
                                  <span 
                                    style={{ 
                                      color: hasTrades ? (isProfitable ? '#008F67' : '#DF1C30') : 'var(--text-muted)',
                                      fontWeight: '600',
                                      fontSize: '11px'
                                    }}
                                  >
                                    {d}
                                  </span>
                                </div>
                                {hasTrades && (
                                  <div className="flex flex-col items-center justify-center flex-1 leading-none mt-1">
                                    <span style={{ fontSize: '10px', color: isProfitable ? '#008F67' : '#DF1C30', fontWeight: 'bold' }}>
                                      {formattedDayPnl}
                                    </span>
                                    <span style={{ fontSize: '9px', color: 'var(--text-sub)' }} className="mt-0.5">
                                      {tradeCount} {tradeCount === 1 ? 'trade' : 'trades'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ADDITION 5 — Account Balance Section */}
                <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', display: 'none' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
                        Account Balance
                      </h2>
                      <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                        Cumulative historical account progression.
                      </p>
                    </div>
                    
                    {/* Starting Balance Input Field at top right */}
                    <div className="flex flex-col">
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500 }} className="mb-1">
                        Starting Balance (₹)
                      </span>
                      <input
                        type="number"
                        value={startingBalanceInput || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          handleStartingBalanceChange(val);
                        }}
                        placeholder="Enter starting balance"
                        style={{
                          backgroundColor: 'var(--card)',
                          border: '0.5px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          padding: '6px 12px',
                          width: '180px'
                        }}
                        className="text-sm font-medium font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    </div>
                  </div>

                  {/* Recharts AreaChart for Account Balance */}
                  <div style={{ width: '100%', height: 200 }} className="mb-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={balanceChartData.dataPoints}
                        margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--bar)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                          tickLine={false}
                          axisLine={{ stroke: 'var(--border)' }}
                          interval={6} // Shows every 7th label to avoid crowding
                        />
                        <YAxis
                          hide={true} // No Y axis label/line
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'var(--card)',
                            border: '0.5px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--text)',
                          }}
                          formatter={(value: any) => [
                            <span key="val" style={{ fontWeight: 'bold', color: 'var(--text)' }}>
                              {'₹' + Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>,
                            'Balance'
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          stroke="var(--accent)"
                          strokeWidth={2}
                          fill="var(--accent)"
                          fillOpacity={0.06}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Row of 3 small info boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    {/* Box 1 — CURRENT BALANCE */}
                    <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }} className="p-3">
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="uppercase tracking-wider">CURRENT BALANCE</div>
                      <div 
                        style={{ 
                          fontSize: '18px', 
                          fontWeight: 700,
                          color: balanceChartData.currentBalance > balanceChartData.startingBalance 
                            ? '#22c55e' 
                            : balanceChartData.currentBalance < balanceChartData.startingBalance 
                              ? '#ef4444' 
                              : 'var(--text)'
                        }} 
                        className="mt-1 font-mono"
                      >
                        ₹{balanceChartData.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Box 2 — TOTAL PROFIT */}
                    <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }} className="p-3">
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="uppercase tracking-wider">TOTAL PROFIT</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }} className="mt-1 font-mono">
                        ₹{balanceChartData.totalWinnerPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Box 3 — TOTAL LOSS */}
                    <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }} className="p-3">
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="uppercase tracking-wider">TOTAL LOSS</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }} className="mt-1 font-mono">
                        ₹{balanceChartData.totalLoserPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Note below boxes */}
                  <p style={{ color: 'var(--text-sub)', fontSize: '11px' }} className="italic">
                    Balance calculated from starting balance + cumulative P&L. Deposits and withdrawals tracking coming soon.
                  </p>
                </div>

                {/* SECTION 5: METRICS + STATS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ display: 'none' }}>
                  {/* LEFT DETAILED STATS */}
                  <div className="lg:col-span-2 rounded-xl p-5 flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', display: 'none' }}>
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
                        Statistics — {startDate} to {endDate}
                      </h2>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3.5 mt-5">
                        {/* NET PNL | TOTAL TRADES */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Net P&L</span>
                          <span className={`text-sm font-mono font-bold ${stats.totalPnl > 0 ? 'text-green-400' : stats.totalPnl < 0 ? 'text-red-400' : ''}`} style={{ color: stats.totalPnl === 0 ? 'var(--text-sub)' : undefined }}>
                            {formatINR(stats.totalPnl)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Trades</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{stats.totalTrades}</span>
                        </div>

                        {/* WIN COUNT | LOSS COUNT */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Win Count</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">{stats.wins.length} matches</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loss Count</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">{stats.losses.length} matches</span>
                        </div>

                        {/* BE COUNT | DNT DAYS */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Breakevens</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-sub)' }}>{stats.breakevens.length} matches</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>DNT Days</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-sub)' }}>{stats.dntDays} days</span>
                        </div>

                        {/* WIN RATE | WIN DAYS % */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Win Rate</span>
                          <span className={`text-sm font-mono font-bold ${getScoreColorClass(stats.winRate)}`}>
                            {stats.winRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Win Days %</span>
                          <span className={`text-sm font-mono font-bold ${getScoreColorClass(stats.winDaysPct)}`}>
                            {stats.winDaysPct.toFixed(1)}%
                          </span>
                        </div>

                        {/* TOTAL PROFIT | TOTAL LOSS */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Gross Profit</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.wins.reduce((sum, t) => sum + (t.pnl || 0), 0))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Gross Loss</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.losses.reduce((sum, t) => sum + (t.pnl || 0), 0))}
                          </span>
                        </div>

                        {/* PROFIT FACTOR | AVG WIN/LOSS RATIO */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Profit Factor</span>
                          <span className={`text-sm font-mono font-bold ${stats.profitFactor > 1.5 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.profitFactor === 999 ? '∞' : stats.profitFactor.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg W:L Ratio</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>
                            {stats.avgWinLossRatio === 999 ? '∞' : `${stats.avgWinLossRatio.toFixed(2)}:1`}
                          </span>
                        </div>

                        {/* AVG WIN | AVG LOSS */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Win Trade</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.avgWin)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Loss Trade</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.avgLoss)}
                          </span>
                        </div>

                        {/* BEST TRADE | WORST TRADE */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Largest Win</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.largestWinTrade)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Largest Loss</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.largestLossTrade)}
                          </span>
                        </div>

                        {/* BEST DAY / WORST DAY */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Best Day</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">
                            {formatPositiveINR(stats.largestProfitDay)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Worst Day</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">
                            {formatPositiveINR(stats.largestLossDay)}
                          </span>
                        </div>

                        {/* STREAKS WIN/LOSS */}
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Best Streak</span>
                          <span className="text-sm font-semibold text-green-400 font-mono">{stats.maxWinStreak} days</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Worst Streak</span>
                          <span className="text-sm font-semibold text-red-400 font-mono">{stats.maxLossStreak} days</span>
                        </div>

                        {/* AVG R | TOTAL R ACCUMULATED */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg R-Multiple</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{stats.avgR.toFixed(2)}R</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total R Sum</span>
                          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{stats.totalRSum.toFixed(2)}R</span>
                        </div>
                      </div>
                    </div>

                    {/* PROFIT FACTOR VERTICAL ALIGNED GAUGES */}
                    <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Profit Factor</span>
                        <span className={`text-xs font-mono font-black ${stats.profitFactor > 1.5 ? 'text-green-400' : 'text-red-400'}`}>
                          {stats.profitFactor === 999 ? '∞' : `${stats.profitFactor.toFixed(2)}x`}
                        </span>
                      </div>
                      <div className="relative w-full h-4 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                        {/* 1.0 Breakeven center marker at 33.3% */}
                        <div className="absolute left-[33.3%] top-0 bottom-0 w-0.5 bg-zinc-450 z-10" />
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((stats.profitFactor / 3) * 100, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Avg Win:Loss Ratio</span>
                        <span className="text-xs font-mono font-black text-indigo-500">
                          {stats.avgWinLossRatio === 999 ? '∞' : `${stats.avgWinLossRatio.toFixed(2)}:1`}
                        </span>
                      </div>
                      <div className="relative w-full h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                        {/* 1.0 Breakeven center marker at 33.3% */}
                        <div className="absolute left-[33.3%] top-0 bottom-0 w-0.5 bg-zinc-450 z-10" />
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((stats.avgWinLossRatio / 3) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT METRICS RADAR */}
                  <div className="lg:col-span-3 rounded-xl p-5 flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
                        Trading Metrics
                      </h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
                        Monthly averages across all trades
                      </p>

                      {/* RADAR RECHARTS */}
                      <div
                        className="w-full h-[220px] mt-4 flex items-center justify-center"
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ outline: 'none', userSelect: 'none' }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            cx="50%"
                            cy="50%"
                            outerRadius="65%"
                            data={[
                              { metric: 'Technical', score: parseFloat(stats.avgTechScore.toFixed(1)) },
                              { metric: 'Psychology', score: parseFloat(stats.avgPsychScore.toFixed(1)) },
                              { metric: 'Risk Mgmt', score: parseFloat(stats.avgRiskScore.toFixed(1)) }
                            ]}
                          >
                            <PolarGrid stroke="var(--bar)" />
                            <PolarAngleAxis
                              dataKey="metric"
                              tick={{ fill: 'var(--text-sub)', fontSize: 11, fontFamily: 'Inter' }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tick={{ fill: '#4B5563', fontSize: 9 }}
                              tickCount={4}
                            />
                            <Radar
                              name="Avg Score"
                              dataKey="score"
                              stroke="var(--accent)"
                              fill="var(--accent)"
                              fillOpacity={0.18}
                              strokeWidth={1.5}
                              dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
                            />
                            <RechartsTooltip content={<RadarTooltip />} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* SCORE PROGRESS BARS */}
                      <div className="mt-4 space-y-3" style={{ display: 'none' }}>
                        {/* TECHNICAL */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Technical (Rules)</span>
                            <span className="text-xs font-mono font-bold" style={{ color: getPercentTextColor(stats.avgTechScore) }}>
                              {stats.avgTechScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgTechScore}%`, backgroundColor: 'var(--accent)' }}
                            />
                          </div>
                        </div>

                        {/* PSYCHOLOGY */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Psychology</span>
                            <span className="text-xs font-mono font-bold" style={{ color: getPercentTextColor(stats.avgPsychScore) }}>
                              {stats.avgPsychScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgPsychScore}%`, backgroundColor: 'var(--accent)' }}
                            />
                          </div>
                        </div>

                        {/* RISK MANAGEMENT */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Risk Management</span>
                            <span className="text-xs font-mono font-bold" style={{ color: getPercentTextColor(stats.avgRiskScore) }}>
                              {stats.avgRiskScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.avgRiskScore}%`, backgroundColor: 'var(--accent)' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* OVERALL SUMMARY CENTER */}
                    <div className="mt-5 pt-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                      <div className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>
                        YOUR SCORE
                      </div>
                      <div className={`text-5xl font-black tracking-tight mt-1 animate-pulse ${getScoreColorClass(stats.avgOverallScore)}`}>
                        {stats.avgOverallScore.toFixed(0)}%
                      </div>
                      <div className="text-[10px] font-mono mt-1 uppercase" style={{ color: 'var(--text-muted)' }}>
                        {startDate} to {endDate}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 6: CONSECUTIVE DAYS / STREAK CARD */}
                <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', display: 'none' }}>
                  <h2 className="text-lg font-semibold tracking-tight flex items-center gap-1.5 mb-5" style={{ color: 'var(--text)' }}>
                    <Flame className="w-5 h-5 text-amber-500" />
                    Streak Analysis — {startDate} to {endDate}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--border)' }}>
                    {/* WIN STREAK */}
                    <div className="flex items-center gap-5 pt-2 md:pt-0">
                      <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shadow-inner">
                        <Trophy className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-green-500 font-mono">
                          {stats.maxWinStreak} {stats.maxWinStreak === 1 ? 'day' : 'days'}
                        </div>
                        <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-sub)' }}>
                          Best Win Streak
                        </div>
                        <div className="text-[11px] font-mono mt-0.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                          Consecutive profitable days
                        </div>
                      </div>
                    </div>

                    {/* LOSS STREAK */}
                    <div className="flex items-center gap-5 pt-5 md:pt-0 md:pl-6" style={{ borderColor: 'var(--border)' }}>
                      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
                        <TrendingDown className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-red-500 font-mono">
                          {stats.maxLossStreak} {stats.maxLossStreak === 1 ? 'day' : 'days'}
                        </div>
                        <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-sub)' }}>
                          Worst Loss Streak
                        </div>
                        <div className="text-[11px] font-mono mt-0.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                          Consecutive losing days
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ADDITIONAL ANALYTICS CONTEXT */}
                  {(stats.largestProfitDay > 0 || stats.largestLossDay > 0) && (
                    <div className="mt-5 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-sub)' }}>
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span>Largest Profitable Day:</span>
                        <strong className="text-green-500 font-mono">{formatPositiveINR(stats.largestProfitDay)}</strong>
                      </div>
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-sub)' }}>
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        <span>Largest Losing Day:</span>
                        <strong className="text-red-500 font-mono">{formatPositiveINR(stats.largestLossDay)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 7: VISUAL PATTERN DATABASE / LIBRARY STATS CARD */}
                <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', display: 'none' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-1.5 font-display" style={{ color: 'var(--text)' }}>
                        <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                        Visual Pattern Database
                      </h2>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-sub)' }}>
                        CLIP Vision index of your chart screenshots for visual similarity search.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl px-4 py-2.5" style={{ backgroundColor: 'var(--row)', border: '0.5px solid var(--border)' }}>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                          Global Indexed Charts
                        </div>
                        <div className="text-xl font-black text-indigo-500 font-mono mt-0.5">
                          {visualLibraryCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t mt-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${confidence.level === 'empty' ? 'bg-zinc-600' : confidence.level === 'building' || confidence.level === 'growing' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                      <span className="text-xs" style={{ color: 'var(--text-sub)' }}>
                        Library matching confidence: <strong className={confidence.color}>{confidence.message}</strong>
                      </span>
                    </div>

                    <p className="text-[11px] font-mono leading-relaxed max-w-md sm:text-right" style={{ color: 'var(--text-muted)' }}>
                      CLIP embeds 512-dimensional vector footprints locally in the browser. 
                      Adding more trade screenshots dynamically strengthens matching accuracy for future visual queries.
                    </p>
                  </div>
                </div>

                {/* Old original elements removed and relocated inside 2-column row above */}
              </div>
            )}
          </div>
        </main>

    {/* ADDITION 1 — Calendar Day Click Popup */}
    {isDayModalOpen && selectedCalendarDay && (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsDayModalOpen(false)}
      >
        <div 
          style={{ 
            backgroundColor: 'var(--card)', 
            border: '0.5px solid var(--border)', 
            borderRadius: '16px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} 
          className="w-full max-w-[680px] p-6 relative flex flex-col gap-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 700 }}>
                {formatDayHeaderDate(selectedCalendarDay)}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span style={{ color: 'var(--text-sub)', fontSize: '12px' }} className="font-semibold uppercase tracking-wider">Day Net P&L:</span>
                <span 
                  className="text-base font-bold font-mono" 
                  style={{ 
                    fontSize: '16px', 
                    fontWeight: 700, 
                    color: clickedDayStats.netPnl > 0 ? '#22c55e' : clickedDayStats.netPnl < 0 ? '#ef4444' : 'var(--text)' 
                  }}
                >
                  {formatINR(clickedDayStats.netPnl)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigate(`/notebook?date=${selectedCalendarDay}`);
                  setIsDayModalOpen(false);
                }}
                style={{
                  backgroundColor: 'var(--card)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-sub)',
                  fontSize: '12px'
                }}
                className="px-3 py-1.5 hover:opacity-85 font-medium transition-all"
              >
                View Note
              </button>
              <button
                onClick={() => setIsDayModalOpen(false)}
                style={{ color: 'var(--text-muted)' }}
                className="p-1 hover:opacity-85 transition-all rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Day stats row (grid of boxes below header, 4 columns, gap 8px) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Box 1 */}
            <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }} className="p-2.5 px-3">
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="uppercase">TOTAL TRADES</div>
              <div style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 700 }} className="mt-0.5 font-mono">{clickedDayStats.totalTrades}</div>
            </div>
            {/* Box 2 */}
            <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }} className="p-2.5 px-3">
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="uppercase">WINNERS</div>
              <div style={{ color: '#22c55e', fontSize: '16px', fontWeight: 700 }} className="mt-0.5 font-mono">{clickedDayStats.winners}</div>
            </div>
            {/* Box 3 */}
            <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }} className="p-2.5 px-3">
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="uppercase">LOSERS</div>
              <div style={{ color: '#ef4444', fontSize: '16px', fontWeight: 700 }} className="mt-0.5 font-mono">{clickedDayStats.losers}</div>
            </div>
            {/* Box 4 */}
            <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }} className="p-2.5 px-3">
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="uppercase">WIN RATE</div>
              <div style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 700 }} className="mt-0.5 font-mono">{clickedDayStats.winRate}%</div>
            </div>
            {/* Box 5 */}
            <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }} className="p-2.5 px-3">
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="uppercase">GROSS P&L</div>
              <div style={{ color: clickedDayStats.grossPnl > 0 ? '#22c55e' : clickedDayStats.grossPnl < 0 ? '#ef4444' : 'var(--text)', fontSize: '16px', fontWeight: 700 }} className="mt-0.5 font-mono">
                {formatINR(clickedDayStats.grossPnl)}
              </div>
            </div>
            {/* Box 6 */}
            <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }} className="p-2.5 px-3">
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="uppercase">COMMISSIONS</div>
              <div style={{ color: '#ef4444', fontSize: '16px', fontWeight: 700 }} className="mt-0.5 font-mono">
                {formatINR(clickedDayStats.commissions)}
              </div>
            </div>
            {/* Box 7 */}
            <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }} className="p-2.5 px-3">
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="uppercase">NET P&L</div>
              <div style={{ color: clickedDayStats.netPnl > 0 ? '#22c55e' : clickedDayStats.netPnl < 0 ? '#ef4444' : 'var(--text)', fontSize: '16px', fontWeight: 700 }} className="mt-0.5 font-mono">
                {formatINR(clickedDayStats.netPnl)}
              </div>
            </div>
            {/* Box 8 */}
            <div style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }} className="p-2.5 px-3">
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="uppercase">PROFIT FACTOR</div>
              <div style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 700 }} className="mt-0.5 font-mono">{clickedDayStats.profitFactor}</div>
            </div>
          </div>

          {/* Trade list table below stats */}
          <div className="overflow-x-auto mt-2 rounded bg-[var(--bg)] border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: 'var(--bar)' }}>
                  <th style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="p-2.5 px-3 uppercase">TIME</th>
                  <th style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="p-2.5 px-3 uppercase">SYMBOL</th>
                  <th style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="p-2.5 px-3 uppercase">DIRECTION</th>
                  <th style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="p-2.5 px-3 uppercase">SETUP</th>
                  <th style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="p-2.5 px-3 uppercase text-right">P&L</th>
                  <th style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }} className="p-2.5 px-3 uppercase text-center">R-MULTIPLE</th>
                  <th className="w-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {clickedDayTrades.map((trade: any) => {
                  const isDirLong = trade.direction === 'LONG' || trade.direction === 'BUY' || trade.option_type === 'CALL';
                  const displayDir = trade.option_type ? `${trade.direction} ${trade.option_type}` : trade.direction;
                  const strategyName = trade.strategies?.name || null;
                  const rMult = typeof trade.r_multiple === 'number' ? trade.r_multiple : null;
                  const formattedR = rMult !== null ? (rMult >= 0 ? `+${rMult.toFixed(1)}R` : `${rMult.toFixed(1)}R`) : '—';
                  
                  const formatTime = (timeStr: string) => {
                    if (!timeStr) return '—';
                    if (timeStr.includes(':')) {
                      return timeStr.slice(0, 5);
                    }
                    return timeStr;
                  };

                  return (
                    <tr 
                      key={trade.id} 
                      style={{ borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}
                      className="transition-colors hover:bg-[var(--row)]"
                      onClick={() => {
                        console.log("Navigating to trade:" + trade.id);
                        navigate(`/trade-tracking/${trade.id}`);
                        setIsDayModalOpen(false);
                      }}
                    >
                      <td style={{ color: 'var(--text-sub)', fontSize: '12px' }} className="p-2.5 px-3 font-mono">
                        {formatTime(trade.entry_time)}
                      </td>
                      <td style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }} className="p-2.5 px-3">
                        {trade.symbol}
                      </td>
                      <td className="p-2.5 px-3">
                        <span 
                          style={{ 
                            fontSize: '10px', 
                            fontWeight: 700,
                            backgroundColor: isDirLong ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isDirLong ? '#22c55e' : '#ef4444'
                          }} 
                          className="px-2 py-0.5 rounded-full inline-block uppercase"
                        >
                          {displayDir || 'N/A'}
                        </span>
                      </td>
                      <td className="p-2.5 px-3">
                        {strategyName ? (
                          <span style={{ color: 'var(--text-sub)', fontSize: '12px' }}>{strategyName}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }} className="italic">No Setup</span>
                        )}
                      </td>
                      <td style={{ color: trade.pnl > 0 ? '#22c55e' : trade.pnl < 0 ? '#ef4444' : 'var(--text)', fontSize: '13px', fontWeight: 700 }} className="p-2.5 px-3 font-mono text-right">
                        {formatINR(trade.pnl)}
                      </td>
                      <td className="p-2.5 px-3 text-center font-mono">
                        <span 
                          style={{ 
                            fontSize: '10px', 
                            fontWeight: 700,
                            backgroundColor: rMult !== null ? (rMult >= 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)') : 'transparent',
                            color: rMult !== null ? (rMult >= 0 ? '#22c55e' : '#ef4444') : 'var(--text-muted)'
                          }} 
                          className="px-2 py-0.5 rounded-full inline-block"
                        >
                          {formattedR}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }} className="p-2.5 pr-4 text-right">
                        →
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modal footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setIsDayModalOpen(false)}
              style={{
                backgroundColor: 'var(--card)',
                border: '0.5px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-sub)',
                fontSize: '13px'
              }}
              className="px-4 py-2 hover:opacity-85 font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsDayModalOpen(false);
                navigate(`/daily-journal?date=${selectedCalendarDay}`);
              }}
              style={{
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600
              }}
              className="px-4 py-2 hover:opacity-90 transition-all font-semibold"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    )}

      </div>
    </div>
  );
};
