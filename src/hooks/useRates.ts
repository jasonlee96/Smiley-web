import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ratesApi } from '../api/rates'
import type { FxProfile } from '../types/rates'
import { useTransferPrefs } from '../context/TransferPrefs'

export function useRates() {
  const latestQuery = useQuery({
    queryKey: ['rates', 'latest'],
    queryFn: ratesApi.getLatest,
    refetchInterval: 300_000,
  })

  const dailyQuery = useQuery({
    queryKey: ['rates', 'daily'],
    queryFn: () => ratesApi.getDaily(30),
    refetchInterval: 300_000,
  })

  return { latestQuery, dailyQuery }
}

export function useFxRecommendation() {
  const { amount, urgency } = useTransferPrefs()
  return useQuery({
    queryKey: ['rates', 'recommendation', amount, urgency],
    queryFn: () => ratesApi.getRecommendation({ amount, urgency }),
    refetchInterval: 300_000,
  })
}

export function useFxProfile() {
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: ['rates', 'profile'],
    queryFn: ratesApi.getProfile,
    staleTime: 300_000,
  })

  const updateTargetRate = useMutation({
    mutationFn: (target_rate: number | null) => ratesApi.updateProfile({ target_rate }),
    onSuccess: (profile: FxProfile) => {
      queryClient.setQueryData(['rates', 'profile'], profile)
      // Recommendation is computed from the stored target rate — refresh it.
      queryClient.invalidateQueries({ queryKey: ['rates', 'recommendation'] })
    },
  })

  return { profileQuery, updateTargetRate }
}
