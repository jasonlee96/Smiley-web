import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quantApi, quantConfigApi } from '../api/quant'

export function useQuantHealth() {
  return useQuery({ queryKey: ['quant', 'health'], queryFn: quantApi.health, refetchInterval: 60_000 })
}

export function useQuantSignals(market?: string, date?: string) {
  return useQuery({
    queryKey: ['quant', 'signals', market, date],
    queryFn: () => quantApi.getSignals({ market, limit: 100 }),
    refetchInterval: 300_000,
  })
}

export function useQuantPositions() {
  return useQuery({
    queryKey: ['quant', 'positions'],
    queryFn: quantApi.getPositions,
    refetchInterval: 60_000,
  })
}

export function useQuantTrades(market?: string) {
  return useQuery({
    queryKey: ['quant', 'trades', market],
    queryFn: () => quantApi.getTrades({ market, limit: 100 }),
    refetchInterval: 300_000,
  })
}

export function useQuantJobs() {
  return useQuery({
    queryKey: ['quant', 'jobs'],
    queryFn: () => quantApi.getJobs(20),
    refetchInterval: 30_000,
  })
}

export function useQuantUniverse(market?: string) {
  return useQuery({
    queryKey: ['quant', 'universe', market],
    queryFn: () => quantApi.getUniverse(market),
  })
}

export function useRunBacktest() {
  return useMutation({
    mutationFn: ({ market, lookback_days }: { market: string; lookback_days: number }) =>
      quantApi.runBacktest(market, lookback_days),
  })
}

export function useTriggerScheduler() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (market: string) => quantApi.triggerScheduler(market),
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ['quant', 'jobs'] }), 3000),
  })
}

export function useQuantConfig() {
  return useQuery({
    queryKey: ['quant', 'config'],
    queryFn: quantConfigApi.getConfig,
    retry: 1,
  })
}

export function useQuantContainerStatus() {
  return useQuery({
    queryKey: ['quant', 'container-status'],
    queryFn: quantConfigApi.getStatus,
    refetchInterval: 15_000,
    retry: 1,
  })
}

export function useSaveQuantConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: Record<string, string | boolean>) => quantConfigApi.saveConfig(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quant', 'config'] }),
  })
}

export function useStartMoomoo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: quantConfigApi.startMoomoo,
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ['quant', 'container-status'] }), 3000),
  })
}

export function useStopMoomoo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: quantConfigApi.stopMoomoo,
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ['quant', 'container-status'] }), 2000),
  })
}

export function useQuantPerformance(days = 90) {
  return useQuery({
    queryKey: ['quant', 'performance', days],
    queryFn: () => quantApi.getPerformance(days),
    refetchInterval: 300_000,
  })
}

export function useQuantPerformanceSummary() {
  return useQuery({
    queryKey: ['quant', 'performance', 'summary'],
    queryFn: quantApi.getPerformanceSummary,
    refetchInterval: 60_000,
  })
}

export function useLatestModel(market = 'US') {
  return useQuery({
    queryKey: ['quant', 'model', market],
    queryFn: () => quantApi.getLatestModel(market),
  })
}

export function useTopSignals(market = 'US') {
  return useQuery({
    queryKey: ['quant', 'signals', 'top', market],
    queryFn: () => quantApi.getTopSignals(market),
    refetchInterval: 300_000,
  })
}

export function useDiscoverMoomooAccounts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: quantApi.getMoomooAccounts,
  })
}

export function useMoomooVerifyStatus(enabled: boolean) {
  return useQuery({
    queryKey: ['quant', 'moomoo-verify-status'],
    queryFn: quantConfigApi.getMoomooVerifyStatus,
    enabled,
    refetchInterval: 8_000,
    retry: false,
  })
}

export function useSubmitMoomooVerifyCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => quantConfigApi.submitMoomooVerifyCode(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quant', 'moomoo-verify-status'] }),
  })
}
