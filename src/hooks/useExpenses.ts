import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '../api/expenses'
import type { CreateEntryInput, PendingStatementState } from '../types/expenses'

// ── Categories ────────────────────────────────────────────────────────────

export function useExpenseCategories() {
  return useQuery({ queryKey: ['expenses', 'categories'], queryFn: expensesApi.getCategories })
}

function invalidateCategories(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['expenses', 'categories'] })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { label: string; slug: string; icon: string; color: string }) =>
      expensesApi.createCategory(data),
    onSuccess: () => invalidateCategories(qc),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { label: string; icon: string; color: string } }) =>
      expensesApi.updateCategory(id, data),
    onSuccess: () => invalidateCategories(qc),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => expensesApi.deleteCategory(id),
    onSuccess: () => invalidateCategories(qc),
  })
}

export function useReorderCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (order: { id: number; sort_order: number }[]) => expensesApi.reorderCategories(order),
    onSuccess: () => invalidateCategories(qc),
  })
}

// ── Months ────────────────────────────────────────────────────────────────

export function useExpenseMonths(limit = 12) {
  return useQuery({ queryKey: ['expenses', 'months', limit], queryFn: () => expensesApi.getMonths(limit) })
}

export function useExpenseMonthDetail(year: number, month: number) {
  return useQuery({
    queryKey: ['expenses', 'months', year, month],
    queryFn: () => expensesApi.getMonthDetail(year, month),
    enabled: !!year && !!month,
  })
}

function invalidateMonths(qc: ReturnType<typeof useQueryClient>) {
  // Broad prefix match: covers both the history list (['expenses','months',limit])
  // and any month-detail queries (['expenses','months',year,month]).
  qc.invalidateQueries({ queryKey: ['expenses', 'months'] })
}

export function useUpdateMonthNotes(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (notes: string | null) => expensesApi.updateMonthNotes(year, month, notes),
    onSuccess: () => invalidateMonths(qc),
  })
}

export function useMoveMonth(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ toYear, toMonth }: { toYear: number; toMonth: number }) =>
      expensesApi.moveMonth(year, month, toYear, toMonth),
    onSuccess: () => {
      invalidateMonths(qc)
      qc.invalidateQueries({ queryKey: ['expenses', 'entries', year, month] })
    },
  })
}

export function useGenerateInsight(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => expensesApi.generateInsight(year, month),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', 'months', year, month] }),
  })
}

// ── Entries ───────────────────────────────────────────────────────────────

export function useExpenseEntries(year: number, month: number) {
  return useQuery({
    queryKey: ['expenses', 'entries', year, month],
    queryFn: () => expensesApi.getEntries(year, month),
    enabled: !!year && !!month,
  })
}

function invalidateEntryQueries(qc: ReturnType<typeof useQueryClient>, year: number, month: number) {
  qc.invalidateQueries({ queryKey: ['expenses', 'entries', year, month] })
  invalidateMonths(qc)
}

export function useCreateEntry(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEntryInput) => expensesApi.createEntry(year, month, data),
    onSuccess: () => invalidateEntryQueries(qc, year, month),
  })
}

export function useUpdateEntry(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateEntryInput }) => expensesApi.updateEntry(id, data),
    onSuccess: () => invalidateEntryQueries(qc, year, month),
  })
}

export function useDeleteEntry(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => expensesApi.deleteEntry(id),
    onSuccess: () => invalidateEntryQueries(qc, year, month),
  })
}

// ── Import ────────────────────────────────────────────────────────────────

export function useImportPreview() {
  return useMutation({
    mutationFn: ({ file, password }: { file: File; password?: string }) =>
      expensesApi.importPreview(file, password),
  })
}

export function useImportConfirm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ transactions, overrideYear, overrideMonth }: {
      transactions: unknown[]; overrideYear?: number; overrideMonth?: number
    }) => expensesApi.importConfirm(transactions, overrideYear, overrideMonth),
    onSuccess: (result) => {
      invalidateMonths(qc)
      for (const ym of result.months_touched) {
        const [y, m] = ym.split('-').map(Number)
        qc.invalidateQueries({ queryKey: ['expenses', 'entries', y, m] })
      }
    },
  })
}

// ── Pending statements (detected from the Gmail digest) ─────────────────────

export function usePendingStatements(states?: PendingStatementState[]) {
  return useQuery({
    queryKey: ['expenses', 'pending-statements', states ?? 'default'],
    queryFn: () => expensesApi.getPendingStatements(states),
    staleTime: 60_000,
  })
}

export function usePreparePendingStatement() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password?: string }) =>
      expensesApi.preparePendingStatement(id, password),
  })
}

export function useUpdatePendingStatement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, state, importedMonthId }: {
      id: number; state: PendingStatementState; importedMonthId?: number
    }) => expensesApi.updatePendingStatement(id, state, importedMonthId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', 'pending-statements'] }),
  })
}
