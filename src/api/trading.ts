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
}
