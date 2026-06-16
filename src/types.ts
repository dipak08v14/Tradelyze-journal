export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  sr_no: number;
  type_of_strategy: string;
  status: 'active' | 'not_working' | 'backtesting';
  sub_type?: string;
}

export interface StrategyRule {
  id: string;
  strategy_id: string;
  user_id: string;
  rule_type: 'entry' | 'exit';
  rule_order: number;
  rule_text: string;
}

export interface Trade {
  id?: string;
  user_id: string;
  strategy_id: string | null;
  date: string;
  symbol: string;
  direction: 'LONG' | 'SHORT' | null;
  option_type: 'CALL' | 'PUT' | null;
  risk: number | null;
  investment: number | null;
  pnl: number | null;
  r_multiple: number | null;
  status: 'Win' | 'Loss' | 'Breakeven' | null;
  max_drawdown: number | null;
  mdd_pct: number | null;
  ror: number | null;
  roi: number | null;
  quantity: number | null;
  points: number | null;
  holding_time_mins: number | null;
  opening_condition: string | null;
  trend_position: string | null;
  entry_time: string | null;
  hourly_trend: 'UP' | 'DOWN' | 'CONSOLIDATION' | null;
  phase: string | null;
  execution_status: 'BEST TRADE' | 'GOOD TRADE' | 'AVERAGE TRADE' | 'POOR TRADE' | 'BAD TRADE' | null;
  mistake_type: 'Technical' | 'Psychological' | 'Risk Management' | 'No Mistake' | null;
  mistake_text: string | null;
  trade_rating: number | null;
  notes: string | null;
  chart_image_url: string | null;
  trade_video_url: string | null;
  trade_plan_url: string | null;
  fees: number;
  month: string;
  year: number;
  needs_review?: boolean;
  sync_source?: string | null;
  broker_ticket?: string | null;
  created_at?: string;
  updated_at?: string;
  strategies?: {
    name: string;
    type_of_strategy: string;
  };
}

export interface StagedRuleState {
  id: string; // internal rule_id
  rule_id: string;
  rule_type: 'entry' | 'exit';
  rule_order: number;
  rule_text: string;
  followed: boolean | null;
}
