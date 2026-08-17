import client from './client';

export interface SplitTour {
  id: number;
  name: string;
  description: string | null;
  base_currency: string;
  allowed_currencies: string[];
  allowed_categories: string[];
  status: 'active' | 'closed';
  start_date: string | null;
  end_date: string | null;
  participant_count?: number;
  expense_count?: number;
  created_at: string;
}

export interface SplitParticipant {
  id: number;
  tour_id: number;
  name: string;
  token: string;
  total_paid_base?: string;
  created_at: string;
}

export interface SplitExpense {
  id: number;
  tour_id: number;
  participant_id: number;
  participant_name?: string;
  description: string;
  amount: string;
  currency: string;
  amount_base: string | null;
  category: string | null;
  split_with: string[];
  expense_date: string | null;
  created_at: string;
}

export interface TourDetail extends SplitTour {
  participants: SplitParticipant[];
  expenses: SplitExpense[];
}

export interface Settlement {
  base_currency: string;
  balances: Array<{ id: number; name: string; paid: number; share: number; balance: number }>;
  transactions: Array<{ from: string; to: string; amount: number }>;
}

export interface SplitSettlement {
  id: number;
  tour_id: number;
  from_name: string;
  to_name: string;
  amount: string;
  currency: string;
  settled: boolean;
  settled_at: string | null;
  note: string | null;
  created_at: string;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export const splitwiseApi = {
  listTours: () =>
    client.get<SplitTour[]>('/splitwise/tours').then(r => r.data),

  createTour: (data: { name: string; description?: string; base_currency: string; allowed_currencies: string[]; allowed_categories: string[]; start_date?: string; end_date?: string }) =>
    client.post<SplitTour>('/splitwise/tours', data).then(r => r.data),

  getTour: (id: number) =>
    client.get<TourDetail>(`/splitwise/tours/${id}`).then(r => r.data),

  updateTour: (id: number, data: Partial<{ name: string; description: string; base_currency: string; allowed_currencies: string[]; allowed_categories: string[]; status: string; start_date: string; end_date: string }>) =>
    client.patch<SplitTour>(`/splitwise/tours/${id}`, data).then(r => r.data),

  deleteTour: (id: number) =>
    client.delete(`/splitwise/tours/${id}`),

  addParticipant: (tourId: number, name: string) =>
    client.post<SplitParticipant>(`/splitwise/tours/${tourId}/participants`, { name }).then(r => r.data),

  removeParticipant: (tourId: number, pid: number) =>
    client.delete(`/splitwise/tours/${tourId}/participants/${pid}`),

  getSettlement: (tourId: number) =>
    client.get<Settlement>(`/splitwise/tours/${tourId}/settlement`).then(r => r.data),

  getRates: (base: string) =>
    client.get<{ base: string; rates: Record<string, number> }>(`/splitwise/rates/${base}`).then(r => r.data),

  listSettlements: (tourId: number) =>
    client.get<SplitSettlement[]>(`/splitwise/tours/${tourId}/settlements`).then(r => r.data),

  createSettlement: (tourId: number, data: { from_name: string; to_name: string; amount: number; currency: string }) =>
    client.post<SplitSettlement>(`/splitwise/tours/${tourId}/settlements`, data).then(r => r.data),

  markSettlement: (tourId: number, sid: number, settled: boolean, note?: string) =>
    client.patch<SplitSettlement>(`/splitwise/tours/${tourId}/settlements/${sid}`, { settled, note }).then(r => r.data),

  deleteSettlement: (tourId: number, sid: number) =>
    client.delete(`/splitwise/tours/${tourId}/settlements/${sid}`),
};

// ── Public (participant, no auth) ─────────────────────────────────────────────
// Uses a plain axios instance — no auth interceptor, no token-cleared side-effects

import axios from 'axios'

const publicClient = axios.create({
  // Pax devices are not on the tailnet, so this must use the Funnel endpoint
  // (publicly reachable) rather than the tailnet-only `tailscale serve` host.
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://ip-172-31-2-167.tail9203bc.ts.net:8443',
  timeout: 15000,
})

export interface ParticipantContext extends Omit<SplitParticipant, 'token'> {
  tour_name: string;
  base_currency: string;
  allowed_currencies: string[];
  allowed_categories: string[];
  tour_status: 'active' | 'closed';
  start_date: string | null;
  end_date: string | null;
}

export interface PublicSummary {
  total_tour_base: number;
  my_paid: number;
  my_share: number;
  balance: number;
}

export interface PublicTransaction {
  from: string;
  to: string;
  amount: number;
}

export interface PublicSettlementRecord {
  from_name: string;
  to_name: string;
  amount: number;
  currency: string;
  settled: boolean;
  settled_at: string | null;
}

export interface PublicContext {
  participant: ParticipantContext;
  expenses: SplitExpense[];
  all_participants: string[];
  summary: PublicSummary;
  my_transactions: PublicTransaction[];
  my_settlements: PublicSettlementRecord[];
}

export const publicSplitApi = {
  getContext: (token: string) =>
    publicClient.get<PublicContext>(`/splitwise/public/${token}`).then(r => r.data),

  addExpense: (token: string, data: { description: string; amount: number; currency: string; category?: string; split_with?: string[]; expense_date?: string }) =>
    publicClient.post<SplitExpense>(`/splitwise/public/${token}/expenses`, data).then(r => r.data),

  deleteExpense: (token: string, eid: number) =>
    publicClient.delete(`/splitwise/public/${token}/expenses/${eid}`),
};
