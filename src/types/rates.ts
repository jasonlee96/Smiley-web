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
