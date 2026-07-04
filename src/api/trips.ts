import client from './client'
import type {
  Trip, TripListItem, BudgetSummary, Expense, PackingItem,
  ChatMessage, ChatMutation, AiBrief, CreateTripInput, CreateActivityInput,
  CreateExpenseInput, Activity, Accommodation, CreateAccommodationInput,
} from '../types/trips'

export const tripsApi = {
  list: () => client.get<TripListItem[]>('/trips').then(r => r.data),
  get: (id: number) => client.get<Trip>(`/trips/${id}`).then(r => r.data),
  create: (data: CreateTripInput) => client.post<Trip>('/trips', data).then(r => r.data),
  update: (id: number, data: CreateTripInput) => client.put<Trip>(`/trips/${id}`, data).then(r => r.data),
  remove: (id: number) => client.delete(`/trips/${id}`),
  patchStatus: (id: number, status: string) =>
    client.patch<Trip>(`/trips/${id}/status`, { status }).then(r => r.data),

  getBudget: (id: number) => client.get<BudgetSummary>(`/trips/${id}/budget`).then(r => r.data),
  getExpenses: (id: number) => client.get<Expense[]>(`/trips/${id}/expenses`).then(r => r.data),
  createExpense: (id: number, data: CreateExpenseInput) =>
    client.post<Expense>(`/trips/${id}/expenses`, data).then(r => r.data),
  deleteExpense: (tripId: number, expId: number) =>
    client.delete(`/trips/${tripId}/expenses/${expId}`),

  getPacking: (id: number) => client.get<PackingItem[]>(`/trips/${id}/packing`).then(r => r.data),
  createPackingItem: (id: number, data: { item: string; category: string }) =>
    client.post<PackingItem>(`/trips/${id}/packing`, data).then(r => r.data),
  togglePackingItem: (tripId: number, itemId: number) =>
    client.patch<PackingItem>(`/trips/${tripId}/packing/${itemId}/toggle`).then(r => r.data),
  deletePackingItem: (tripId: number, itemId: number) =>
    client.delete(`/trips/${tripId}/packing/${itemId}`),
  clearPacking: (id: number) => client.delete(`/trips/${id}/packing`),
  aiPacking: (id: number) => client.post(`/trips/${id}/ai-packing`, {}, { timeout: 0 }),

  createActivity: (tripId: number, dayId: number, data: CreateActivityInput) =>
    client.post<Activity>(`/trips/${tripId}/days/${dayId}/activities`, data).then(r => r.data),
  updateActivity: (tripId: number, actId: number, data: CreateActivityInput) =>
    client.put<Activity>(`/trips/${tripId}/activities/${actId}`, data).then(r => r.data),
  deleteActivity: (tripId: number, actId: number) =>
    client.delete(`/trips/${tripId}/activities/${actId}`),

  getAccommodations: (id: number) => client.get<Accommodation[]>(`/trips/${id}/accommodations`).then(r => r.data),
  createAccommodation: (id: number, data: CreateAccommodationInput) =>
    client.post<Accommodation>(`/trips/${id}/accommodations`, data).then(r => r.data),
  updateAccommodation: (id: number, accId: number, data: CreateAccommodationInput) =>
    client.put<Accommodation>(`/trips/${id}/accommodations/${accId}`, data).then(r => r.data),
  deleteAccommodation: (id: number, accId: number) =>
    client.delete(`/trips/${id}/accommodations/${accId}`),

  aiBrief: (id: number) => client.post<AiBrief>(`/trips/${id}/ai-brief`, {}, { timeout: 0 }).then(r => r.data),
  aiEnrich: (id: number) => client.post(`/trips/${id}/ai-enrich`, {}, { timeout: 0 }),

  getChat: (id: number) =>
    client.get<{ messages: ChatMessage[] }>(`/trips/${id}/chat`).then(r => r.data.messages),
  sendMessage: (id: number, message: string) =>
    client.post<{ message: string; mutations: ChatMutation[] }>(`/trips/${id}/chat`, { message }, { timeout: 0 }).then(r => r.data),
  clearChat: (id: number) => client.delete(`/trips/${id}/chat`),
}
