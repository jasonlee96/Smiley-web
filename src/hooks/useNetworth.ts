import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { networthApi } from '../api/networth'
import type { Asset, Loan } from '../types/networth'

export function useAssets() {
  return useQuery({ queryKey: ['assets'], queryFn: networthApi.getAssets })
}

export function useAssetsSummary() {
  return useQuery({ queryKey: ['assets', 'summary'], queryFn: networthApi.getAssetsSummary, refetchInterval: 300_000 })
}

export function useNetworthHistory(days: number) {
  return useQuery({
    queryKey: ['assets', 'networth-history', days],
    queryFn: () => networthApi.getNetworthHistory(days),
    refetchInterval: 300_000,
  })
}

function invalidateAssetQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['assets'] })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Asset>) => networthApi.createAsset(data),
    onSuccess: () => invalidateAssetQueries(qc),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Asset> }) => networthApi.updateAsset(id, data),
    onSuccess: () => invalidateAssetQueries(qc),
  })
}

export function useUpdateAssetValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, value }: { id: number; value: number }) => networthApi.updateAssetValue(id, value),
    onSuccess: () => invalidateAssetQueries(qc),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => networthApi.deleteAsset(id),
    onSuccess: () => invalidateAssetQueries(qc),
  })
}

export function useLoans() {
  return useQuery({ queryKey: ['loans'], queryFn: networthApi.getLoans })
}

function invalidateLoanQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['loans'] })
  qc.invalidateQueries({ queryKey: ['assets', 'summary'] })
}

export function useCreateLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Loan>) => networthApi.createLoan(data),
    onSuccess: () => invalidateLoanQueries(qc),
  })
}

export function useUpdateLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Loan> }) => networthApi.updateLoan(id, data),
    onSuccess: () => invalidateLoanQueries(qc),
  })
}

export function useDeleteLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => networthApi.deleteLoan(id),
    onSuccess: () => invalidateLoanQueries(qc),
  })
}

export function useLogLoanPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) => networthApi.logLoanPayment(id, amount),
    onSuccess: () => invalidateLoanQueries(qc),
  })
}

export function useLoanPayoff(id: number, extraMonthly: number) {
  return useQuery({
    queryKey: ['loans', id, 'payoff', extraMonthly],
    queryFn: () => networthApi.getLoanPayoff(id, extraMonthly),
    enabled: !!id,
  })
}

export function useLoanAmortization(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['loans', id, 'amortization'],
    queryFn: () => networthApi.getLoanAmortization(id),
    enabled: enabled && !!id,
  })
}
