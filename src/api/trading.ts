import client from './client'
import type {
  AssetType,
  Timeframe,
  TradingSnapshot,
  WatchlistItem,
  SnapshotHistoryItem,
  TradingAlert,
  TradingMonitorSettings,
  DcaRankedItem,
  AccumulationsResponse,
  AccumulationEntry,
  TradingOrderProposal,
  ProposalsResponse,
  BotWalletResponse,
  MarketDiscoveryItem,
} from '../types/trading'

export const tradingApi = {
  getWatchlist: () =>
    client.get<WatchlistItem[]>('/trading/watchlist').then((r) => r.data),

  addToWatchlist: (payload: {
    symbol: string
    asset_type?: AssetType
    timeframe?: Timeframe
    name?: string
    notes?: string
  }) =>
    client
      .post<{ item: WatchlistItem; snapshot: TradingSnapshot | null }>('/trading/watchlist', payload, {
        timeout: 25000,
      })
      .then((r) => r.data),

  removeFromWatchlist: (id: number) =>
    client.delete<{ ok: boolean }>(`/trading/watchlist/${id}`).then((r) => r.data),

  updateWatchlistItem: (
    id: number,
    payload: {
      target_above?: number | string | null
      target_below?: number | string | null
      alerts_enabled?: boolean
      timeframe?: Timeframe
      notes?: string | null
    },
  ) => client.patch<WatchlistItem>(`/trading/watchlist/${id}`, payload).then((r) => r.data),

  getAlerts: (limit = 40) =>
    client
      .get<{ unread_count: number; alerts: TradingAlert[] }>('/trading/alerts', { params: { limit } })
      .then((r) => r.data),

  markAlertsRead: () =>
    client.patch<{ ok: boolean }>('/trading/alerts/read').then((r) => r.data),

  getSettings: () =>
    client.get<TradingMonitorSettings>('/trading/settings').then((r) => r.data),

  saveSettings: (payload: Partial<TradingMonitorSettings>) =>
    client.put<TradingMonitorSettings>('/trading/settings', payload).then((r) => r.data),

  testSlack: (payload?: Partial<TradingMonitorSettings>) =>
    client.post<{ ok: boolean; error?: string }>('/trading/settings/test-slack', payload || {}).then((r) => r.data),

  runMonitorNow: () =>
    client
      .post<{ scanned: number; alertsTriggered: number; slackSent: number; alerts: TradingAlert[] }>(
        '/trading/monitor/run',
        {},
        { timeout: 60000 },
      )
      .then((r) => r.data),

  refreshWatchlist: () =>
    client
      .post<{ ok: boolean; total: number; succeeded: number; failed: number }>(
        '/trading/watchlist/refresh',
        {},
        { timeout: 45000 },
      )
      .then((r) => r.data),

  fetchTicker: (payload: { symbol: string; asset_type?: AssetType; timeframe?: Timeframe }) =>
    client
      .post<TradingSnapshot>('/trading/fetch', payload, { timeout: 25000 })
      .then((r) => r.data),

  analyzeTicker: (payload: {
    symbol: string
    asset_type?: AssetType
    timeframe?: Timeframe
    use_claude?: boolean
  }) =>
    client
      .post<TradingSnapshot>('/trading/analyze', payload, { timeout: 60000 })
      .then((r) => r.data),

  getSnapshots: (symbol: string, params?: { timeframe?: Timeframe; asset_type?: AssetType }) =>
    client
      .get<{ latest: TradingSnapshot | null; history: SnapshotHistoryItem[] }>(
        `/trading/snapshots/${encodeURIComponent(symbol)}`,
        { params },
      )
      .then((r) => r.data),

  getDcaRanking: () =>
    client
      .get<DcaRankedItem[]>('/trading/dca-ranking', { timeout: 35000 })
      .then((r) => r.data),

  getAccumulations: () =>
    client.get<AccumulationsResponse>('/trading/accumulations').then((r) => r.data),

  addAccumulation: (payload: {
    symbol: string
    asset_type?: AssetType
    currency?: string
    units: number
    price_per_unit: number
    total_amount?: number
    lot_label?: string
    bought_at?: string
    notes?: string
  }) => client.post<AccumulationEntry>('/trading/accumulations', payload).then((r) => r.data),

  deleteAccumulation: (id: number) =>
    client.delete<{ ok: boolean }>(`/trading/accumulations/${id}`).then((r) => r.data),

  getProposals: () =>
    client.get<ProposalsResponse>('/trading/proposals').then((r) => r.data),

  createProposal: (payload: {
    symbol: string
    name?: string
    asset_type?: AssetType
    currency?: string
    qty: number
    proposed_price: number
    lot_label?: string
    trade_env?: 'SIMULATE' | 'REAL'
    proposed_dca_score?: number
    proposed_rsi?: number | null
    proposed_signal?: string
    proposal_reason?: string
  }) => client.post<TradingOrderProposal>('/trading/proposals', payload).then((r) => r.data),

  runBotProposalReview: (id?: number) =>
    client
      .post<{
        ok: boolean
        proposal?: TradingOrderProposal
        reviewed?: number
        cancelledStale?: number
        newlyStaged?: number
      }>('/trading/proposals/bot-review', id != null ? { id } : {}, { timeout: 45000 })
      .then((r) => r.data),

  approveProposal: (
    id: number,
    payload?: {
      execute_on_moomoo?: boolean
      trade_env?: 'SIMULATE' | 'REAL'
      execution_price?: number
      qty?: number
    },
  ) =>
    client
      .post<TradingOrderProposal>(`/trading/proposals/${id}/approve`, payload || {}, { timeout: 25000 })
      .then((r) => r.data),

  rejectProposal: (id: number) =>
    client.post<TradingOrderProposal>(`/trading/proposals/${id}/reject`, {}).then((r) => r.data),

  getBotWallet: (trd_env?: 'SIMULATE' | 'REAL') =>
    client
      .get<BotWalletResponse>('/trading/bot-wallet', { params: trd_env ? { trd_env } : undefined })
      .then((r) => r.data),

  updateBotWallet: (allocated_budget: number) =>
    client
      .put<{ ok: boolean; budget: BotWalletResponse['budget'] }>('/trading/bot-wallet', {
        allocated_budget,
      })
      .then((r) => r.data),

  getMarketDiscovery: (refresh = false) =>
    client
      .get<MarketDiscoveryItem[]>('/trading/market-discovery', {
        params: refresh ? { refresh: 'true' } : undefined,
        timeout: 45000,
      })
      .then((r) => r.data),
}
