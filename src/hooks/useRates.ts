import { useQuery } from '@tanstack/react-query'
import { ratesApi } from '../api/rates'

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
