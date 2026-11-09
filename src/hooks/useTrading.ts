import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tradingApi } from '../api/trading'
import type { AssetType, Timeframe } from '../types/trading'

export function useTradingWatchlist() {
  return useQuery({
    queryKey: ['trading', 'watchlist'],
    queryFn: tradingApi.getWatchlist,
  })
}

export function useTradingSnapshot(symbol: string | null, timeframe?: Timeframe, assetType?: AssetType) {
  return useQuery({
    queryKey: ['trading', 'snapshot', symbol, timeframe],
    queryFn: () => tradingApi.getSnapshots(symbol!, { timeframe, asset_type: assetType }),
    enabled: Boolean(symbol),
  })
}

export function useFetchTicker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.fetchTicker,
    onSuccess: (snapshot) => {
      qc.invalidateQueries({ queryKey: ['trading', 'watchlist'] })
      qc.invalidateQueries({ queryKey: ['trading', 'snapshot', snapshot.symbol] })
    },
  })
}

export function useAnalyzeTicker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.analyzeTicker,
    onSuccess: (snapshot) => {
      qc.invalidateQueries({ queryKey: ['trading', 'watchlist'] })
      qc.invalidateQueries({ queryKey: ['trading', 'snapshot', snapshot.symbol] })
    },
  })
}

export function useAddWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.addToWatchlist,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'watchlist'] })
      qc.invalidateQueries({ queryKey: ['trading', 'dca-ranking'] })
      qc.invalidateQueries({ queryKey: ['trading', 'market-discovery'] })
    },
  })
}

export function useRemoveWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.removeFromWatchlist,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'watchlist'] })
      qc.invalidateQueries({ queryKey: ['trading', 'dca-ranking'] })
    },
  })
}

export function useRefreshWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.refreshWatchlist,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'watchlist'] })
      qc.invalidateQueries({ queryKey: ['trading', 'snapshot'] })
      qc.invalidateQueries({ queryKey: ['trading', 'dca-ranking'] })
      qc.invalidateQueries({ queryKey: ['trading', 'accumulations'] })
    },
  })
}

export function useUpdateWatchlistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof tradingApi.updateWatchlistItem>[1] }) =>
      tradingApi.updateWatchlistItem(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'watchlist'] })
    },
  })
}

export function useTradingAlerts(limit = 40) {
  return useQuery({
    queryKey: ['trading', 'alerts', limit],
    queryFn: () => tradingApi.getAlerts(limit),
    refetchInterval: 60000,
  })
}

export function useMarkTradingAlertsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.markAlertsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'alerts'] })
    },
  })
}

export function useTradingSettings() {
  return useQuery({
    queryKey: ['trading', 'settings'],
    queryFn: tradingApi.getSettings,
  })
}

export function useSaveTradingSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.saveSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'settings'] })
    },
  })
}

export function useTestTradingSlack() {
  return useMutation({
    mutationFn: tradingApi.testSlack,
  })
}

export function useRunTradingMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.runMonitorNow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'watchlist'] })
      qc.invalidateQueries({ queryKey: ['trading', 'alerts'] })
      qc.invalidateQueries({ queryKey: ['trading', 'snapshot'] })
      qc.invalidateQueries({ queryKey: ['trading', 'dca-ranking'] })
    },
  })
}

export function useDcaRanking() {
  return useQuery({
    queryKey: ['trading', 'dca-ranking'],
    queryFn: tradingApi.getDcaRanking,
  })
}

export function useAccumulations() {
  return useQuery({
    queryKey: ['trading', 'accumulations'],
    queryFn: tradingApi.getAccumulations,
  })
}

export function useAddAccumulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.addAccumulation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'accumulations'] })
      qc.invalidateQueries({ queryKey: ['trading', 'dca-ranking'] })
    },
  })
}

export function useDeleteAccumulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.deleteAccumulation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'accumulations'] })
      qc.invalidateQueries({ queryKey: ['trading', 'dca-ranking'] })
    },
  })
}

export function useTradingProposals() {
  return useQuery({
    queryKey: ['trading', 'proposals'],
    queryFn: tradingApi.getProposals,
    refetchInterval: 45000,
  })
}

export function useCreateProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.createProposal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'proposals'] })
      qc.invalidateQueries({ queryKey: ['trading', 'bot-wallet'] })
    },
  })
}

export function useBotProposalReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.runBotProposalReview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'proposals'] })
      qc.invalidateQueries({ queryKey: ['trading', 'dca-ranking'] })
      qc.invalidateQueries({ queryKey: ['trading', 'bot-wallet'] })
    },
  })
}

export function useApproveProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload?: Parameters<typeof tradingApi.approveProposal>[1]
    }) => tradingApi.approveProposal(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'proposals'] })
      qc.invalidateQueries({ queryKey: ['trading', 'accumulations'] })
      qc.invalidateQueries({ queryKey: ['trading', 'dca-ranking'] })
      qc.invalidateQueries({ queryKey: ['trading', 'bot-wallet'] })
    },
  })
}

export function useRejectProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.rejectProposal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'proposals'] })
      qc.invalidateQueries({ queryKey: ['trading', 'bot-wallet'] })
    },
  })
}

export function useBotWallet(trdEnv?: 'SIMULATE' | 'REAL') {
  return useQuery({
    queryKey: ['trading', 'bot-wallet', trdEnv],
    queryFn: () => tradingApi.getBotWallet(trdEnv),
    refetchInterval: 45000,
  })
}

export function useUpdateBotWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.updateBotWallet,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'bot-wallet'] })
      qc.invalidateQueries({ queryKey: ['trading', 'proposals'] })
    },
  })
}

export function useMarketDiscovery() {
  return useQuery({
    queryKey: ['trading', 'market-discovery'],
    queryFn: () => tradingApi.getMarketDiscovery(false),
  })
}

export function useRefreshMarketDiscovery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => tradingApi.getMarketDiscovery(true),
    onSuccess: (data) => {
      qc.setQueryData(['trading', 'market-discovery'], data)
    },
  })
}
