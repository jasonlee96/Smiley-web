export interface RateLatest {
  id: string
  rate_date: string
  buy_rate: number
  sell_rate: number
  source: string
  created_at: string
}

export interface RateDaily {
  rate_date: string
  buy_rate: string
  sell_rate: string
  count: string
}

export interface FxTier {
  min?: number
  max?: number
  fee_fixed?: number
  fee_percent?: number
}

export interface FxProfile {
  id: number
  name: string
  enabled: boolean
  target_rate: number | null
  fee_fixed: number
  fee_percent: number
  tier_json: FxTier[]
  created_at: string
  updated_at: string
}

export interface FxRecommendation {
  id: number
  amount_sgd: number
  urgency: 'low' | 'medium' | 'high'
  decision: 'exchange_now' | 'wait' | 'split'
  confidence: number
  raw_rate: number
  effective_rate: number
  target_rate: number | null
  features: {
    percentile_7d: number | null
    percentile_30d: number | null
    percentile_90d: number | null
    ma_gap_7d: number | null
    ma_gap_30d: number | null
    vol_zscore: number | null
  }
  reasons: string[]
  fee: {
    fixed: number
    percent: number
    total_myr: number
  }
  generated_at: string
}

export interface FxRecommendationResponse {
  amount_sgd: number
  urgency: 'low' | 'medium' | 'high'
  profile: FxProfile
  latest_rate: {
    id: number
    rate: number
    date: string
  }
  recommendation: FxRecommendation
}
