import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { weatherApi } from '../api/weather'

export function useWeather() {
  const qc = useQueryClient()

  const latestQuery = useQuery({
    queryKey: ['weather', 'latest'],
    queryFn: weatherApi.getLatest,
    refetchInterval: 300_000,
  })

  const locationsQuery = useQuery({
    queryKey: ['weather', 'locations'],
    queryFn: weatherApi.getLocations,
  })

  const refreshMutation = useMutation({
    mutationFn: weatherApi.refresh,
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ['weather'] }), 3000),
  })

  return { latestQuery, locationsQuery, refreshMutation }
}

export function useWeatherHistory(locationId: number) {
  return useQuery({
    queryKey: ['weather', 'history', locationId],
    queryFn: () => weatherApi.getHistory(locationId, 7),
    enabled: locationId > 0,
  })
}
