import client from './client'
import type { Asset, Loan, NetWorthSummary, NetWorthHistoryPoint, PayoffResult, AmortizationRow } from '../types/networth'

export const networthApi = {
  getAssets: () => client.get<Asset[]>('/assets').then(r => r.data),
  getAssetsSummary: () => client.get<NetWorthSummary>('/assets/summary').then(r => r.data),
  getNetworthHistory: (days: number) =>
    client.get<NetWorthHistoryPoint[]>('/assets/networth-history', { params: { days } }).then(r => r.data),
  createAsset: (data: Partial<Asset>) => client.post<Asset>('/assets', data).then(r => r.data),
  updateAsset: (id: number, data: Partial<Asset>) => client.put<Asset>(`/assets/${id}`, data).then(r => r.data),
  updateAssetValue: (id: number, value: number) =>
    client.patch<Asset>(`/assets/${id}/update-value`, { value }).then(r => r.data),
  deleteAsset: (id: number) => client.delete(`/assets/${id}`),

  getLoans: () => client.get<Loan[]>('/loans').then(r => r.data),
  createLoan: (data: Partial<Loan>) => client.post<Loan>('/loans', data).then(r => r.data),
  updateLoan: (id: number, data: Partial<Loan>) => client.put<Loan>(`/loans/${id}`, data).then(r => r.data),
  deleteLoan: (id: number) => client.delete(`/loans/${id}`),
  logLoanPayment: (id: number, amount: number) =>
    client.patch<Loan>(`/loans/${id}/payment`, { amount }).then(r => r.data),
  getLoanPayoff: (id: number, extraMonthly: number) =>
    client.get<PayoffResult>(`/loans/${id}/payoff`, { params: { extra_monthly: extraMonthly } }).then(r => r.data),
  getLoanAmortization: (id: number) =>
    client.get<AmortizationRow[]>(`/loans/${id}/amortization`).then(r => r.data),
}
