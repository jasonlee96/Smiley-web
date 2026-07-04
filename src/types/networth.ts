export type AssetType = 'property' | 'vehicle' | 'cash' | 'investment' | 'epf' | 'fd' | 'crypto' | 'other'
export type DepreciationType = 'manual' | 'straight_line' | 'declining_balance'
export type LoanType = 'home' | 'car' | 'personal' | 'other'

export interface Asset {
  id: number
  name: string
  asset_type: AssetType
  currency: string
  value: number
  purchase_price: number | null
  purchase_date: string | null
  depreciation_type: DepreciationType | null
  institution: string | null
  notes: string | null
  current_value_local: number
  current_value_myr: number
  sgd_rate: number
}

export interface Loan {
  id: number
  name: string
  loan_type: LoanType
  principal: number
  outstanding: number
  interest_rate: number
  monthly_payment: number
  start_date: string
  due_day: number
  is_active: boolean
  linked_asset_id: number | null
  linked_asset_name: string | null
}

export interface NetWorthSummary {
  net_worth_myr: number
  total_assets_myr: number
  total_liabilities_myr: number
  assets_by_type: Record<string, number>
  sgd_rate: number
  insight: string
}

export interface NetWorthHistoryPoint {
  snapshot_date: string
  total_assets_myr: number
  total_liabilities_myr: number
  net_worth_myr: number
}

export interface PayoffResult {
  outstanding: number
  base_months: number
  base_total_interest: number
  with_extra_months: number
  with_extra_total_interest: number
  months_saved: number
  interest_saved: number
  extra_monthly: number
  interest_paid_to_date: number
}

export interface AmortizationRow {
  month_num: number
  payment_date: string
  payment: number
  principal: number
  interest: number
  balance: number
}
