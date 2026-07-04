import axios from 'axios'
import type { Stock, Signal, Position, Trade, JobLog, BacktestResult } from '../types/quant'
import client from './client'

const quantClient = axios.create({
  baseURL: (import.meta.env.VITE_QUANT_API_URL as string) || 'http://localhost:8500',
  timeout: 30000,
})

export const quantApi = {
  health: () => quantClient.get<{ status: string; version: string }>('/health').then(r => r.data),

  getUniverse: (market?: string) =>
    quantClient.get<Stock[]>('/universe', { params: market ? { market } : {} }).then(r => r.data),

  getSignals: (params?: { market?: string; date?: string; limit?: number }) =>
    quantClient.get<Signal[]>('/signals', { params }).then(r => r.data),

  getPositions: () =>
    quantClient.get<Position[]>('/positions').then(r => r.data),

  getTrades: (params?: { market?: string; limit?: number }) =>
    quantClient.get<Trade[]>('/trades', { params }).then(r => r.data),

  getJobs: (limit?: number) =>
    quantClient.get<JobLog[]>('/jobs', { params: { limit: limit ?? 20 } }).then(r => r.data),

  runBacktest: (market: string, lookback_days: number) =>
    quantClient.post<BacktestResult>('/backtest', { market, lookback_days }).then(r => r.data),

  triggerScheduler: (market: string) =>
    quantClient.post<{ status: string; market: string }>('/scheduler/run', { market }).then(r => r.data),

  getPerformance: (days = 90) =>
    quantClient.get('/performance', { params: { mode: 'paper', days } }).then(r => r.data),

  getPerformanceSummary: () =>
    quantClient.get('/performance/summary', { params: { mode: 'paper' } }).then(r => r.data),

  getLatestModel: (market: string) =>
    quantClient.get('/model/latest', { params: { market } }).then(r => r.data),

  getTopSignals: (market: string, limit = 10) =>
    quantClient.get('/signals/top', { params: { market, limit } }).then(r => r.data),

  getMoomooAccounts: () =>
    quantClient.get('/futu/accounts').then(r => r.data),
}

export const quantConfigApi = {
  getConfig: () => client.get('/quant/config').then(r => r.data),
  saveConfig: (updates: Record<string, string | boolean>) => client.patch('/quant/config', updates).then(r => r.data),
  getStatus: () => client.get('/quant/status').then(r => r.data),
  getMoomooVerifyStatus: () => client.get('/quant/moomoo/verify-status').then(r => r.data),
  submitMoomooVerifyCode: (code: string) => client.post('/quant/moomoo/verify-code', { code }).then(r => r.data),
  startMoomoo: () => client.post('/quant/moomoo/start').then(r => r.data),
  stopMoomoo: () => client.post('/quant/moomoo/stop').then(r => r.data),
  triggerPipeline: (market: string) => client.post('/quant/pipeline', { market }).then(r => r.data),
}
