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
