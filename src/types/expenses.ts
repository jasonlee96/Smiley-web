export type EntryType = 'income' | 'expense'
export type Currency = 'MYR' | 'SGD'
export type ParseConfidence = 'high' | 'low'

export interface ExpenseCategory {
  id: number
  slug: string
  label: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface ExpenseMonthSummary {
  id: number
  year: number
  month: number
  total_income: number
  total_expenses: number
  net_savings: number
  entry_count: number
}

export interface CategoryBreakdown {
  category_id: number
  slug: string
  label: string
  color: string
  icon: string
  total: number
  count: number
}

export interface IncomeSource {
  label: string
  total: number
}

export interface ExpenseMonthDetail {
  id: number
  year: number
  month: number
  notes: string | null
  total_income: number
  total_expenses: number
  net_savings: number
  savings_rate: number
  by_category: CategoryBreakdown[]
  income_sources: IncomeSource[]
  insight: string | null
  insight_generated_at: string | null
}

export interface ExpenseEntryRaw {
  id: number
  month_id: number
  entry_type: EntryType
  category_id: number | null
  label: string
  amount: string
  currency: Currency
  original_amount: string | null
  exchange_rate: string | null
  entry_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  category_slug: string | null
  category_label: string | null
  category_color: string | null
  category_icon: string | null
}

export interface ExpenseEntry extends Omit<ExpenseEntryRaw, 'amount' | 'original_amount' | 'exchange_rate'> {
  amount: number
  original_amount: number | null
  exchange_rate: number | null
}

export interface CreateEntryInput {
  entry_type: EntryType
  category_id?: number | null
  label: string
  amount: number
  currency?: Currency
  entry_date?: string | null
  notes?: string | null
}

export interface DraftTransaction {
  id: string
  entry_date: string | null
  label: string
  amount: number
  currency: Currency
  original_amount: null
  category_slug: string
  category_id: number | null
  category_label: string
  category_color: string
  category_icon: string
  excluded: boolean
  parse_confidence: ParseConfidence
}

export interface ImportPreviewResult {
  transactions: DraftTransaction[]
  total_parsed: number
  text_truncated: boolean
  statement_month: string | null
  skipped_rows: number
}

export interface ImportConfirmResult {
  inserted: number
  skipped: number
  months_touched: string[]
}
