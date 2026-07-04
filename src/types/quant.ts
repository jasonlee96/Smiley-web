export interface Stock {
  id: number
  ticker: string
  name: string
  market: 'US' | 'SGX'
  active: boolean
}

export interface Signal {
  id: number
  date: string
  score: number
  direction: 'BUY' | 'HOLD' | 'SELL'
  model_version: string
  generated_at: string
  ticker: string
  market: string
  name: string
}

export interface Position {
  id: number
  ticker: string
  mode: string
  entry_date: string
  entry_price: number
  quantity: number
  stop_loss: number
  take_profit: number
  futu_order_id: string | null
  market: string
  name: string
}

export interface Trade {
  id: number
  ticker: string
  mode: string
  entry_date: string
  entry_price: number
  exit_date: string | null
  exit_price: number | null
  quantity: number
  pnl: number
  pnl_pct: number
  hold_days: number
  exit_reason: string | null
  market: string
  name: string
}

export interface JobLog {
  id: number
  job_name: string
  started_at: string
  finished_at: string | null
  status: 'running' | 'success' | 'failed'
  error_message: string | null
}

export interface BacktestResult {
  total_return: number
  annualised_return: number
  sharpe: number
  max_drawdown: number
  win_rate: number
  profit_factor: number
  avg_hold_days: number
  trade_count: number
  equity_curve: { date: string; equity: number }[]
}
