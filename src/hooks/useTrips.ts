import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tripsApi } from '../api/trips'
import type { CreateTripInput, CreateActivityInput, CreateExpenseInput } from '../types/trips'

export function useTrips() {
  return useQuery({ queryKey: ['trips'], queryFn: tripsApi.list, staleTime: 30_000 })
}

export function useTrip(id: number) {
  return useQuery({
    queryKey: ['trips', id],
    queryFn: () => tripsApi.get(id),
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useTripBudget(id: number) {
  return useQuery({
    queryKey: ['trips', id, 'budget'],
    queryFn: () => tripsApi.getBudget(id),
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useTripExpenses(id: number) {
  return useQuery({
    queryKey: ['trips', id, 'expenses'],
    queryFn: () => tripsApi.getExpenses(id),
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useTripPacking(id: number) {
  return useQuery({
    queryKey: ['trips', id, 'packing'],
    queryFn: () => tripsApi.getPacking(id),
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useTripChat(id: number) {
  return useQuery({
    queryKey: ['trips', id, 'chat'],
    queryFn: () => tripsApi.getChat(id),
    staleTime: Infinity,
    enabled: !!id,
  })
}

export function useCreateTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTripInput) => tripsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })
}

export function useUpdateTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateTripInput }) => tripsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['trips', id] })
    },
  })
}

export function useDeleteTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => tripsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })
}

export function usePatchTripStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => tripsApi.patchStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['trips', id] })
    },
  })
}

export function useCreateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, dayId, data }: { tripId: number; dayId: number; data: CreateActivityInput }) =>
      tripsApi.createActivity(tripId, dayId, data),
    onSuccess: (_, { tripId }) => qc.invalidateQueries({ queryKey: ['trips', tripId] }),
  })
}

export function useUpdateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, actId, data }: { tripId: number; actId: number; data: CreateActivityInput }) =>
      tripsApi.updateActivity(tripId, actId, data),
    onSuccess: (_, { tripId }) => qc.invalidateQueries({ queryKey: ['trips', tripId] }),
  })
}

export function useDeleteActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, actId }: { tripId: number; actId: number }) =>
      tripsApi.deleteActivity(tripId, actId),
    onSuccess: (_, { tripId }) => qc.invalidateQueries({ queryKey: ['trips', tripId] }),
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, data }: { tripId: number; data: CreateExpenseInput }) =>
      tripsApi.createExpense(tripId, data),
    onSuccess: (_, { tripId }) => {
      qc.invalidateQueries({ queryKey: ['trips', tripId, 'expenses'] })
      qc.invalidateQueries({ queryKey: ['trips', tripId, 'budget'] })
    },
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, expId }: { tripId: number; expId: number }) =>
      tripsApi.deleteExpense(tripId, expId),
    onSuccess: (_, { tripId }) => {
      qc.invalidateQueries({ queryKey: ['trips', tripId, 'expenses'] })
      qc.invalidateQueries({ queryKey: ['trips', tripId, 'budget'] })
    },
  })
}

export function useTogglePackingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, itemId }: { tripId: number; itemId: number }) =>
      tripsApi.togglePackingItem(tripId, itemId),
    onSuccess: (_, { tripId }) => qc.invalidateQueries({ queryKey: ['trips', tripId, 'packing'] }),
  })
}

export function useCreatePackingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, item, category }: { tripId: number; item: string; category: string }) =>
      tripsApi.createPackingItem(tripId, { item, category }),
    onSuccess: (_, { tripId }) => qc.invalidateQueries({ queryKey: ['trips', tripId, 'packing'] }),
  })
}

export function useDeletePackingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, itemId }: { tripId: number; itemId: number }) =>
      tripsApi.deletePackingItem(tripId, itemId),
    onSuccess: (_, { tripId }) => qc.invalidateQueries({ queryKey: ['trips', tripId, 'packing'] }),
  })
}

export function useClearPacking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tripId: number) => tripsApi.clearPacking(tripId),
    onSuccess: (_, tripId) => qc.invalidateQueries({ queryKey: ['trips', tripId, 'packing'] }),
  })
}

export function useAiPacking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tripId: number) => tripsApi.aiPacking(tripId),
    onSuccess: (_, tripId) => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['trips', tripId, 'packing'] }), 3000)
    },
  })
}

export function useTripAccommodations(id: number) {
  return useQuery({
    queryKey: ['trips', id, 'accommodations'],
    queryFn: () => tripsApi.getAccommodations(id),
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useCreateAccommodation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, data }: { tripId: number; data: import('../types/trips').CreateAccommodationInput }) =>
      tripsApi.createAccommodation(tripId, data),
    onSuccess: (_, { tripId }) => qc.invalidateQueries({ queryKey: ['trips', tripId, 'accommodations'] }),
  })
}

export function useUpdateAccommodation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, accId, data }: { tripId: number; accId: number; data: import('../types/trips').CreateAccommodationInput }) =>
      tripsApi.updateAccommodation(tripId, accId, data),
    onSuccess: (_, { tripId }) => qc.invalidateQueries({ queryKey: ['trips', tripId, 'accommodations'] }),
  })
}

export function useDeleteAccommodation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, accId }: { tripId: number; accId: number }) =>
      tripsApi.deleteAccommodation(tripId, accId),
    onSuccess: (_, { tripId }) => qc.invalidateQueries({ queryKey: ['trips', tripId, 'accommodations'] }),
  })
}

export function useAiBrief() {
  return useMutation({
    mutationFn: (tripId: number) => tripsApi.aiBrief(tripId),
  })
}

export function useAiEnrich() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tripId: number) => tripsApi.aiEnrich(tripId),
    onSuccess: (_, tripId) => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['trips', tripId] }), 3000)
    },
  })
}

export function useSendChatMessage(tripId: number) {
  return useMutation({
    mutationFn: (message: string) => tripsApi.sendMessage(tripId, message),
    // No auto-invalidation — ChatTab controls timing to sync with typewriter animation
  })
}

export function useClearChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tripId: number) => tripsApi.clearChat(tripId),
    onSuccess: (_, tripId) => qc.invalidateQueries({ queryKey: ['trips', tripId, 'chat'] }),
  })
}
