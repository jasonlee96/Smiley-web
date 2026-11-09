import client from './client'
import type {
  AssetType,
  Timeframe,
  TradingSnapshot,
  WatchlistItem,
  SnapshotHistoryItem,
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
}
