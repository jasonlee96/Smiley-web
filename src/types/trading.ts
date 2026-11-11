export type AssetType = 'stock' | 'etf' | 'crypto'
export type Timeframe = '1h' | '4h' | '1d' | '1w'
export type TechnicalSignal = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'

export interface OhlcvBar {
  time: number
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface ChartDataPoint extends OhlcvBar {
  sma20: number | null
  sma50: number | null
  ema21: number | null
  bbUpper: number | null
  bbMiddle: number | null
  bbLower: number | null
  rsi: number | null
  macd: number | null
  macdSignal: number | null
  macdHist: number | null
}

export interface MovingAverageRow {
  label: string
  period: number
  type: 'SMA' | 'EMA'
  value: number | null
  distancePct: number | null
  signal: 'bullish' | 'bearish' | 'neutral'
}

export interface TechnicalIndicators {
  price: number
  changePct: number
  barCount: number
  movingAverages: {
    sma20: number | null
    sma50: number | null
    sma200: number | null
    ema9: number | null
    ema21: number | null
    ema50: number | null
    ema200: number | null
    alignment: 'bullish_stack' | 'bearish_stack' | 'mixed'
    goldenCross: boolean
    deathCross: boolean
    rows: MovingAverageRow[]
  }
  rsi: {
    value: number
    prev: number
    slope5: number
    state: 'overbought' | 'oversold' | 'bullish' | 'bearish' | 'neutral'
  }
  stochastic: {
    k: number
    d: number
    state: 'overbought' | 'oversold' | 'bullish' | 'bearish'
  }
  macd: {
    macd: number
    signal: number
    histogram: number
    prevHistogram: number
    state: 'bullish_cross' | 'bearish_cross' | 'bullish_momentum' | 'bearish_momentum'
  }
  bollinger: {
    upper: number
    middle: number
    lower: number
    percentB: number
    bandwidthPct: number
    squeeze: boolean
  }
  atr: {
    value: number
    pct: number
  }
  volume: {
    latest: number
    avg20: number
    rvol: number
  }
  structure: {
    periodHigh: number
    periodLow: number
    rangePositionPct: number
    supportLevels: number[]
    resistanceLevels: number[]
  }
  composite: {
    score: number
    signal: TechnicalSignal
    trendScore: number
    momentumScore: number
    structureScore: number
  }
  chartSeries: ChartDataPoint[]
}

export interface TradingAiAnalysis {
  bias: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  regime: 'trending_up' | 'trending_down' | 'ranging' | 'high_volatility' | 'breakout_squeeze'
  summary: string
  bull_thesis: string[]
  bear_thesis: string[]
  key_observations: string[]
  trade_setup: {
    direction: 'long' | 'short' | 'wait'
    entry_zone: string
    stop_loss: string
    targets: string[]
    risk_reward: string
    position_sizing_note: string
    invalidation: string
  }
  engine: 'quant-engine' | 'claude-cli'
  prompt_for_chat: string
  generated_at: string
}

export interface TradingSnapshot {
  id: number
  symbol: string
  asset_type: AssetType
  timeframe: Timeframe
  currency: string
  name: string
  exchange: string
  price: number
  change_pct: number
  ohlcv: OhlcvBar[]
  indicators: TechnicalIndicators
  technical_score: number
  technical_signal: TechnicalSignal
  ai_analysis: TradingAiAnalysis | null
  fetched_at: string
}

export interface WatchlistItem {
  id: number
  symbol: string
  asset_type: AssetType
  name: string
  timeframe: Timeframe
  notes: string | null
  target_above: number | null
  target_below: number | null
  alerts_enabled: boolean
  created_at: string
  latest: {
    snapshot_id: number
    currency: string
    exchange: string
    price: number
    change_pct: number
    technical_score: number
    technical_signal: TechnicalSignal
    rsi: number | null
    atr_pct: number | null
    bb_squeeze: boolean
    ai_bias: 'bullish' | 'bearish' | 'neutral' | null
    setup_direction: 'long' | 'short' | 'wait' | null
    fetched_at: string
  } | null
}

export interface TradingAlert {
  id: number
  symbol: string
  asset_type: AssetType
  timeframe: Timeframe
  alert_type: 'signal_flip' | 'entry_zone' | 'key_level' | 'rsi_extreme' | 'squeeze_breakout' | 'price_target'
  severity: 'bullish' | 'bearish' | 'warning' | 'info'
  title: string
  message: string
  price: number
  read: boolean
  slack_sent: boolean
  created_at: string
}

export interface TradingMonitorSettings {
  monitor_enabled: boolean
  slack_enabled: boolean
  slack_webhook_url: string
  slack_bot_token: string
  slack_channel: string
  slack_webhook_set?: boolean
  slack_token_set?: boolean
  notify_signal_flip: boolean
  notify_key_levels: boolean
  notify_extreme_rsi: boolean
  notify_price_targets: boolean
}

export interface SnapshotHistoryItem {
  id: number
  symbol: string
  timeframe: Timeframe
  price: number
  change_pct: number
  technical_score: number
  technical_signal: TechnicalSignal
  ai_bias: 'bullish' | 'bearish' | 'neutral' | null
  fetched_at: string
}

export interface DcaOpportunity {
  dca_score: number
  dca_tier: 'top_buy' | 'accumulate' | 'limit_dip' | 'wait_extended'
  dca_label: string
  drawdown_from_high_pct: number
  dist_sma200_pct: number | null
  dist_sma50_pct: number | null
  ideal_dip_price: number
  deep_value_price: number
  unit_100_shares: number
  unit_100_at_dip: number
  lot_100_cost: number
  lot_100_at_dip: number
  reasons: string[]
}

export interface DcaRankedItem {
  rank: number
  watchlist_id: number
  symbol: string
  asset_type: AssetType
  name: string
  timeframe: Timeframe
  currency: string
  exchange: string
  price: number
  change_pct: number
  technical_score: number
  technical_signal: TechnicalSignal
  rsi: number | null
  sma200: number | null
  sma50: number | null
  support_s1: number | null
  period_high: number | null
  ai_bias: 'bullish' | 'bearish' | 'neutral' | null
  ai_summary: string | null
  dca: DcaOpportunity | null
  holding: {
    total_units: number
    total_invested: number
    avg_cost: number
    tranche_count: number
    market_value: number
    unrealized_pnl: number
    unrealized_pnl_pct: number
    below_avg_cost: boolean
  } | null
  fetched_at: string | null
}

export interface AccumulationEntry {
  id: number
  symbol: string
  asset_type: AssetType
  currency: string
  side?: 'BUY' | 'SELL'
  units: number
  price_per_unit: number
  total_amount: number
  realized_pnl?: number | null
  lot_label: string
  bought_at: string
  notes: string | null
  created_at: string
}

export interface AccumulationHolding {
  symbol: string
  name: string
  asset_type: AssetType
  currency: string
  total_units: number
  bought_units?: number
  sold_units?: number
  sellable_units?: number
  total_invested: number
  avg_cost: number
  current_price: number
  market_value: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  realized_pnl?: number
  tranche_count: number
  last_bought_at: string
  below_avg_cost: boolean
}

export interface AccumulationsResponse {
  totals: {
    total_invested: number
    total_market_value: number
    total_unrealized_pnl: number
    total_unrealized_pnl_pct: number
    total_realized_pnl?: number
    total_tranches: number
    holdings_count: number
  }
  holdings: AccumulationHolding[]
  entries: AccumulationEntry[]
}

export interface TradingOrderProposal {
  id: number
  symbol: string
  name: string
  asset_type: AssetType
  market: string
  currency: string
  side: string
  qty: number
  proposed_price: number
  total_estimated_cost: number
  lot_label: string
  trade_env: 'SIMULATE' | 'REAL'
  proposed_dca_score: number
  proposed_rsi: number | null
  proposed_signal: string
  proposal_reason: string
  source: 'bot_hourly' | 'bot_discovery' | 'bot_take_profit' | 'manual'
  status: 'pending_approval' | 'executed' | 'cancelled_bot_stale' | 'rejected_user' | 'failed'
  still_worth_it: boolean
  bot_review_count: number
  current_price: number
  current_dca_score: number
  current_rsi: number | null
  price_drift_pct: number
  avg_cost_basis?: number | null
  realized_pnl?: number | null
  last_bot_review_note: string | null
  last_bot_review_at: string | null
  moomoo_order_id: string | null
  execution_note: string | null
  created_at: string
  reviewed_at: string | null
}

export interface ProposalsResponse {
  pending_count: number
  proposals: TradingOrderProposal[]
}

export interface BotWalletResponse {
  budget: {
    allocated_budget: number
    used_budget: number
    sell_proceeds_recycled?: number
    realized_profit?: number
    reserved_pending: number
    available_bot_balance: number
    unreserved_bot_balance: number
  }
  moomoo: {
    connected: boolean
    acc_id: string | null
    trd_env: string
    currency: string
    cash: number | null
    total_assets: number | null
    market_val: number | null
    buying_power: number | null
    us_cash?: number | null
    sg_cash?: number | null
    usd_assets?: number | null
    sgd_assets?: number | null
    error?: string
  }
}

export interface MarketDiscoveryItem {
  rank: number
  symbol: string
  name: string
  asset_type: AssetType
  market: 'US' | 'SGX' | 'CRYPTO'
  category: string
  thesis_hook: string
  currency: string
  exchange: string
  price: number
  change_pct: number
  technical_score: number
  technical_signal: TechnicalSignal
  rsi: number | null
  sma200: number | null
  support_s1: number | null
  dca: DcaOpportunity
  discovery_reasons: string[]
  why_propose_summary: string
  fetched_at: string
}
