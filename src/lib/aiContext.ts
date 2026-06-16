export function buildSystemPrompt(contextData: string): string {
  return `You are an expert ICT (Inner Circle Trader) trading coach and performance analyst embedded in TRADELYZE, a professional trading journal.

YOUR ROLE:
- Analyze this trader's actual data and give personalized coaching
- Identify patterns across Technical execution, Psychology, and Risk Management
- Be specific — reference exact numbers, setups, and dates from their data
- Connect the dots between metrics and give the WHY behind the numbers
- Give 1-3 clear, actionable next steps at the end of every response
- Reference ICT concepts accurately: OB, FVG, CHoCH, MSS, Liquidity sweeps, Killzones, PO3, Premium/Discount
- Be direct and concise — professional trading tool, not a casual chatbot
- If the trader asks about a specific trade, analyze every dimension of it

CRITICAL: Never say you cannot see their data. All data is provided below. Always respond in the trader's context.

═══ TRADER DATA ═══
${contextData}`;
}

interface StrategyContext {
  name: string;
  type_of_strategy: string;
  tradeCount?: number;
  winRate?: number;
  totalPnl?: number;
  entryRules?: Array<{ rule_text: string }>;
}

interface ContextStringParams {
  totalTrades: number;
  winRate?: number;
  profitFactor?: number;
  avgR?: number;
  totalPnl?: number;
  avgTechScore?: number;
  avgPsychScore?: number;
  avgRiskScore?: number;
  avgOverallScore?: number;
  monthName: string;
  year: number;
  monthTrades: number;
  monthWinRate?: number;
  monthPnl?: number;
  strategies?: StrategyContext[];
  recentTrades?: any[];
  mistakeBreakdown?: any;
  topMistake?: [string, number] | null;
  specificTrade?: any;
  specificTradeRules?: any[] | null;
  specificTradePsych?: any;
  specificTradeRisk?: any;
}

export function buildContextString({
  // Overall stats
  totalTrades, winRate, profitFactor, avgR, totalPnl,
  avgTechScore, avgPsychScore, avgRiskScore, avgOverallScore,
  // Monthly stats (current month)
  monthName, year, monthTrades, monthWinRate, monthPnl,
  // Strategies
  strategies,
  // Recent trades
  recentTrades,
  // Mistake patterns
  mistakeBreakdown, topMistake,
  // Specific trade (if asked about one)
  specificTrade = null,
  specificTradeRules = null,
  specificTradePsych = null,
  specificTradeRisk = null
}: ContextStringParams): string {
  let ctx = '';

  ctx += `\n=== OVERALL PERFORMANCE (All Time) ===\n`;
  ctx += `Total Trades: ${totalTrades}\n`;
  ctx += `Win Rate: ${winRate?.toFixed(1)}%\n`;
  ctx += `Profit Factor: ${profitFactor === 999 ? '∞' : profitFactor?.toFixed(2)}\n`;
  ctx += `Avg R-Multiple: ${avgR?.toFixed(2)}R\n`;
  ctx += `Total P&L: ₹${totalPnl?.toLocaleString('en-IN')}\n`;
  ctx += `Avg Technical Score: ${avgTechScore?.toFixed(0)}%\n`;
  ctx += `Avg Psychology Score: ${avgPsychScore?.toFixed(0)}%\n`;
  ctx += `Avg Risk Management Score: ${avgRiskScore?.toFixed(0)}%\n`;
  ctx += `Avg Overall Score: ${avgOverallScore?.toFixed(0)}%\n`;

  ctx += `\n=== THIS MONTH (${monthName} ${year}) ===\n`;
  ctx += `Trades: ${monthTrades} | Win Rate: ${monthWinRate?.toFixed(1)}% | P&L: ₹${monthPnl?.toLocaleString('en-IN')}\n`;

  if (strategies && strategies.length > 0) {
    ctx += `\n=== MY STRATEGIES ===\n`;
    strategies.forEach(s => {
      ctx += `• ${s.name} (${s.type_of_strategy}) — ${s.tradeCount || 0} trades, ${s.winRate?.toFixed(0) || 0}% WR, ₹${(s.totalPnl || 0).toLocaleString('en-IN')} P&L\n`;
      if (s.entryRules && s.entryRules.length > 0) {
        ctx += `  Entry Rules: ${s.entryRules.map((r, i) => `${i+1}. ${r.rule_text}`).join(' | ')}\n`;
      }
    });
  }

  if (recentTrades && recentTrades.length > 0) {
    ctx += `\n=== RECENT TRADES (Last ${recentTrades.length}) ===\n`;
    ctx += `Date | Symbol | Dir | Setup | P&L | R | Status | Execution | Mistake\n`;
    recentTrades.forEach(t => {
      const dirStr = `${t.direction || ''}${t.option_type ? ` (${t.option_type})` : ''}` || '—';
      ctx += `${t.date} | ${t.symbol} | ${dirStr} | ${t.strategies?.name || 'No Setup'} | ₹${(t.pnl || 0).toLocaleString('en-IN')} | ${t.r_multiple?.toFixed(1) || '—'}R | ${t.status || '—'} | ${t.execution_status || '—'} | ${t.mistake_text || 'None'}\n`;
    });
  }

  if (mistakeBreakdown) {
    ctx += `\n=== MISTAKE PATTERNS ===\n`;
    ctx += `Technical Mistakes: ${mistakeBreakdown.Technical || 0}\n`;
    ctx += `Psychological Mistakes: ${mistakeBreakdown.Psychological || 0}\n`;
    ctx += `Risk Management Mistakes: ${mistakeBreakdown['Risk Management'] || 0}\n`;
    ctx += `Clean Trades (No Mistake): ${mistakeBreakdown['No Mistake'] || 0}\n`;
    if (topMistake) ctx += `Most Repeated Mistake: "${topMistake[0]}" (${topMistake[1]} times)\n`;
  }

  if (specificTrade) {
    const specDirStr = `${specificTrade.direction || ''}${specificTrade.option_type ? ` (${specificTrade.option_type})` : ''}`;
    ctx += `\n=== SPECIFIC TRADE BEING ANALYZED ===\n`;
    ctx += `Trade: ${specificTrade.symbol} ${specDirStr} — ${specificTrade.date}\n`;
    ctx += `Setup: ${specificTrade.strategies?.name || 'No Setup'}\n`;
    ctx += `P&L: ₹${(specificTrade.pnl || 0).toLocaleString('en-IN')} (${specificTrade.r_multiple?.toFixed(2) || '—'}R) — ${specificTrade.status}\n`;
    ctx += `Investment: ₹${(specificTrade.investment || 0).toLocaleString('en-IN')} | Risk: ₹${(specificTrade.risk || 0).toLocaleString('en-IN')}\n`;
    ctx += `ROI: ${specificTrade.roi?.toFixed(2) || '—'}% | ROR: ${specificTrade.ror?.toFixed(2) || '—'}%\n`;
    ctx += `Execution: ${specificTrade.execution_status || '—'} | Rating: ${specificTrade.trade_rating || '—'}/5\n`;
    ctx += `Mistake Type: ${specificTrade.mistake_type || 'None'} — ${specificTrade.mistake_text || 'None'}\n`;
    ctx += `Opening: ${specificTrade.opening_condition || '—'} | Phase: ${specificTrade.phase || '—'}\n`;
    ctx += `Hourly Trend: ${specificTrade.hourly_trend || '—'} | Trend Position: ${specificTrade.trend_position || '—'}\n`;
    ctx += `Holding Time: ${specificTrade.holding_time_mins || '—'} mins\n`;
    if (specificTrade.notes) ctx += `Trader Notes: "${specificTrade.notes}"\n`;

    if (specificTradeRules && specificTradeRules.length > 0) {
      const entryRules = specificTradeRules.filter(r => r.rule_type === 'entry');
      const exitRules = specificTradeRules.filter(r => r.rule_type === 'exit');
      const techScore = specificTradeRules.length > 0
        ? (specificTradeRules.filter(r => r.followed).length / specificTradeRules.length * 100).toFixed(0)
        : '0';
      ctx += `Technical Score: ${techScore}%\n`;
      ctx += `Entry Rules:\n`;
      entryRules.forEach(r => { ctx += `  ${r.followed ? '✓' : '✗'} ${r.rule_text}\n`; });
      ctx += `Exit Rules:\n`;
      exitRules.forEach(r => { ctx += `  ${r.followed ? '✓' : '✗'} ${r.rule_text}\n`; });
    }

    if (specificTradePsych) {
      ctx += `Psychology — External Factors: ${specificTradePsych.external_stress_pct}% | Price Action Reading: ${specificTradePsych.price_action_reading_pct}% | Confidence: ${specificTradePsych.confidence_pct}% | Entry Levels: ${specificTradePsych.entry_levels_pct}% | Anxiety: ${specificTradePsych.anxiety_pct}% | Fear: ${specificTradePsych.fear_pct}% | Composite: ${specificTradePsych.psychological_condition_pct?.toFixed(1)}%\n`;
    }

    if (specificTradeRisk) {
      ctx += `Risk Management — Planned Risk: ₹${(specificTradeRisk.decided_risk || 0).toLocaleString('en-IN')} | Rules Followed: ${specificTradeRisk.followed_risk_rules_pct}%\n`;
    }
  }

  return ctx;
}
