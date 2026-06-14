export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  totalPnl: number;
  winRate: number;
  avgR: number;
  totalWinsPnl: number;
  totalLossesPnl: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
}

export interface DayGroup {
  date: string;
  tradeCount: number;
  symbols: string;
  setups: string;
  wins: number;
  losses: number;
  breakevens: number;
  pnl: number;
  cumulativePnl: number;
  dayStatus: 'Win' | 'Loss' | 'BE';
}

export interface ScoreAverages {
  avgTech: number;
  avgPsych: number;
  avgRisk: number;
  avgOverall: number;
}

export interface StreakStats {
  maxWinStreak: number;
  maxLossStreak: number;
}

export function calcTradeStats(trades: any[]): TradeStats | null {
  if (!trades || trades.length === 0) return null;
  const wins = trades.filter(t => t.status === 'Win');
  const losses = trades.filter(t => t.status === 'Loss');
  const breakevens = trades.filter(t => t.status === 'Breakeven');
  const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const rTrades = trades.filter(t => t.r_multiple != null);
  const avgR = rTrades.length > 0 ? rTrades.reduce((s, t) => s + t.r_multiple, 0) / rTrades.length : 0;
  const totalWinsPnl = wins.reduce((s, t) => s + (t.pnl || 0), 0);
  const totalLossesPnl = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0));
  const profitFactor = totalLossesPnl > 0 ? totalWinsPnl / totalLossesPnl : (totalWinsPnl > 0 ? 999 : 0);
  const avgWin = wins.length > 0 ? totalWinsPnl / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLossesPnl / losses.length : 0;
  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl || 0)) : 0;
  const largestLoss = losses.length > 0 ? Math.abs(Math.min(...losses.map(t => t.pnl || 0))) : 0;
  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakevens: breakevens.length,
    totalPnl,
    winRate,
    avgR,
    totalWinsPnl,
    totalLossesPnl,
    profitFactor,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss
  };
}

export function calcDayGroups(trades: any[]): DayGroup[] {
  const map: Record<string, any[]> = {};
  trades.forEach(t => {
    if (!t.date) return;
    if (!map[t.date]) map[t.date] = [];
    map[t.date].push(t);
  });
  let cumPnl = 0;
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, dayTrades]) => {
      const dayPnl = dayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
      cumPnl += dayPnl;
      const dayWins = dayTrades.filter(t => t.status === 'Win').length;
      const dayLosses = dayTrades.filter(t => t.status === 'Loss').length;
      const dayBE = dayTrades.filter(t => t.status === 'Breakeven').length;
      return {
        date,
        tradeCount: dayTrades.length,
        symbols: [...new Set(dayTrades.map(t => t.symbol))].join(', '),
        setups: [...new Set(dayTrades.map(t => t.strategies?.name).filter(Boolean))].join(', '),
        wins: dayWins,
        losses: dayLosses,
        breakevens: dayBE,
        pnl: dayPnl,
        cumulativePnl: parseFloat(cumPnl.toFixed(2)),
        dayStatus: dayPnl > 0 ? 'Win' as const : dayPnl < 0 ? 'Loss' as const : 'BE' as const
      };
    });
}

export function calcScoreAverages(
  tradeIds: string[],
  psychData: any[],
  riskData: any[],
  rulesData: any[]
): ScoreAverages {
  const avgPsych = psychData.length > 0
    ? psychData.reduce((s, p) => s + (p.psychological_condition_pct || 0), 0) / psychData.length
    : 0;
  const avgRisk = riskData.length > 0
    ? riskData.reduce((s, r) => s + (r.followed_risk_rules_pct || 0), 0) / riskData.length
    : 0;
  const techByTrade: Record<string, { total: number; yes: number }> = {};
  rulesData.forEach(r => {
    if (!techByTrade[r.trade_id]) techByTrade[r.trade_id] = { total: 0, yes: 0 };
    techByTrade[r.trade_id].total++;
    if (r.followed === true) techByTrade[r.trade_id].yes++;
  });
  const techScores = Object.values(techByTrade).map(t => t.total > 0 ? (t.yes / t.total) * 100 : 0);
  const avgTech = techScores.length > 0 ? techScores.reduce((a, b) => a + b, 0) / techScores.length : 0;
  return {
    avgTech: parseFloat(avgTech.toFixed(1)),
    avgPsych: parseFloat(avgPsych.toFixed(1)),
    avgRisk: parseFloat(avgRisk.toFixed(1)),
    avgOverall: parseFloat(((avgTech + avgPsych + avgRisk) / 3).toFixed(1))
  };
}

export function calcStreaks(dayGroups: DayGroup[]): StreakStats {
  let maxWin = 0;
  let maxLoss = 0;
  let curWin = 0;
  let curLoss = 0;
  dayGroups.forEach(d => {
    if (d.pnl > 0) {
      curWin++;
      curLoss = 0;
      maxWin = Math.max(maxWin, curWin);
    } else if (d.pnl < 0) {
      curLoss++;
      curWin = 0;
      maxLoss = Math.max(maxLoss, curLoss);
    } else {
      curWin = 0;
      curLoss = 0;
    }
  });
  return { maxWinStreak: maxWin, maxLossStreak: maxLoss };
}

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_INDEX = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

export const scoreColor = (v: number) => v >= 70 ? 'text-green-400' : v >= 50 ? 'text-amber-400' : 'text-red-400';
export const pnlColor = (v: number) => v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-zinc-400';
export const formatINR = (v: number) => {
  const isNegative = v < 0;
  const absVal = Math.abs(v || 0);
  const formatted = absVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isNegative ? '-' : ''}₹${formatted}`;
};
export const formatINRShort = (v: number) => {
  const formatted = Math.abs(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return `${v < 0 ? '-' : ''}₹${formatted}`;
};
export const formatPositiveINR = (v: number) => {
  return '₹' + Math.abs(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
