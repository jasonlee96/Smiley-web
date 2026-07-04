import { useQuery } from '@tanstack/react-query'
import { ratesApi } from '../api/rates'
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
