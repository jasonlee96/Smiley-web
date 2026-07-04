export type TripStatus = 'planning' | 'upcoming' | 'active' | 'completed' | 'cancelled'
export type ActivityType = 'accommodation' | 'transport' | 'meal' | 'attraction' | 'other'

export interface Activity {
  id: number
  trip_id: number
  trip_day_id: number
  activity_type: ActivityType
  title: string
  notes: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  booking_ref: string | null
  estimated_cost_myr: number | null
  sort_order: number | null
  lat: number | null
  lng: number | null
  name_zh: string | null
  image_url: string | null
  image_attribution: string | null
}

export interface TripDay {
  id: number
  trip_id: number
  day_number: number
  day_date: string
  title: string | null
  activities: Activity[]
}

export interface Trip {
  id: number
  name: string
  cover_emoji: string
  destination_city: string
  destination_country: string | null
  start_date: string
  end_date: string
  status: TripStatus
  budget_myr: number | null
  budget_sgd: number | null
  actual_spend_myr: number | null
  notes: string | null
  days: TripDay[]
  created_at: string
  updated_at: string
}

export interface TripListItem {
  id: number
  name: string
  cover_emoji: string
  destination_city: string
  destination_country: string | null
  start_date: string
  end_date: string
  status: TripStatus
  budget_myr: number | null
  actual_spend_myr: number | null
  created_at: string
  updated_at: string
}

export interface Expense {
  id: number
  trip_id: number
  category: string
  description: string
  amount: number
  currency: string
  amount_myr: number | null
  exchange_rate: number | null
  spent_at: string | null
  created_at: string
}

export interface PackingItem {
  id: number
  trip_id: number
  category: string
  item: string
  packed: boolean
  ai_generated: boolean
  sort_order: number | null
  created_at: string
}

export type AccommodationStatus = 'suggested' | 'confirmed'

export interface Accommodation {
  id: number
  trip_id: number
  hotel_name: string
  location: string | null
  check_in: string
  check_out: string
  status: AccommodationStatus
  confirmation_ref: string | null
  notes: string | null
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

export interface CreateAccommodationInput {
  hotel_name: string
  location?: string | null
  check_in: string
  check_out: string
  status?: AccommodationStatus
  confirmation_ref?: string | null
  notes?: string | null
}

export interface ChatMessage {
  id: number
  trip_id: number
  role: 'user' | 'assistant'
  content: string
  tool_calls?: Array<{ tool: string; input: any; result: string }> | null
  created_at: string
}

export interface ChatMutation {
  tool: string
  description: string
}

export interface BudgetSummary {
  planned_budget_myr: number | null
  planned_budget_sgd: number | null
  actual_spend_myr: number
  estimated_cost_myr: number
  remaining_myr: number | null
  sgd_rate: number
  breakdown: Array<{ category: string; estimated: number; actual: number }>
  expense_count: number
}

export interface AiBrief {
  packing_list: Array<{ category: string; item: string }>
  activity_suggestions: Array<{ day: number; suggestion: string }>
  budget_notes: string
  weather_summary: string
  generated_at: string
}

export interface CreateTripInput {
  name: string
  cover_emoji?: string
  destination_city: string
  destination_country?: string
  start_date: string
  end_date: string
  budget_myr?: number | null
  notes?: string
}

export interface CreateActivityInput {
  activity_type: ActivityType
  title: string
  notes?: string | null
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  estimated_cost_myr?: number | null
  name_zh?: string | null
}

export interface CreateExpenseInput {
  description: string
  amount: number
  currency: string
  category: string
}
