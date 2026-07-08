import client from './client'
import type {
  ExpenseCategory, ExpenseMonthSummary, ExpenseMonthDetail,
  ExpenseEntry, ExpenseEntryRaw, CreateEntryInput,
  ImportPreviewResult, ImportConfirmResult,
  PendingStatement, PendingStatementState, PreparePendingResult,
} from '../types/expenses'

function parseEntry(e: ExpenseEntryRaw): ExpenseEntry {
  return {
    ...e,
    amount: parseFloat(e.amount),
    original_amount: e.original_amount != null ? parseFloat(e.original_amount) : null,
    exchange_rate: e.exchange_rate != null ? parseFloat(e.exchange_rate) : null,
  }
}

export const expensesApi = {
  getCategories: () => client.get<ExpenseCategory[]>('/expenses/categories').then(r => r.data),
  createCategory: (data: { label: string; slug: string; icon: string; color: string }) =>
    client.post<ExpenseCategory>('/expenses/categories', data).then(r => r.data),
  reorderCategories: (order: { id: number; sort_order: number }[]) =>
    client.patch('/expenses/categories/reorder', { order }),
  updateCategory: (id: number, data: { label: string; icon: string; color: string }) =>
    client.put<ExpenseCategory>(`/expenses/categories/${id}`, data).then(r => r.data),
  deleteCategory: (id: number) => client.delete(`/expenses/categories/${id}`),

  getMonths: (limit = 12, offset = 0) =>
    client.get<ExpenseMonthSummary[]>('/expenses/months', { params: { limit, offset } }).then(r => r.data),
  getMonthDetail: (year: number, month: number) =>
    client.get<ExpenseMonthDetail>(`/expenses/months/${year}/${month}`).then(r => r.data),
  updateMonthNotes: (year: number, month: number, notes: string | null) =>
    client.patch(`/expenses/months/${year}/${month}/notes`, { notes }),
  moveMonth: (year: number, month: number, toYear: number, toMonth: number) =>
    client.patch(`/expenses/months/${year}/${month}/move-to`, { to_year: toYear, to_month: toMonth }),
  generateInsight: (year: number, month: number) =>
    client.post<{ insight: string; generated_at: string }>(`/expenses/months/${year}/${month}/insight`).then(r => r.data),

  getEntries: (year: number, month: number) =>
    client.get<ExpenseEntryRaw[]>(`/expenses/months/${year}/${month}/entries`).then(r => r.data.map(parseEntry)),
  createEntry: (year: number, month: number, data: CreateEntryInput) =>
    client.post<ExpenseEntryRaw>(`/expenses/months/${year}/${month}/entries`, data).then(r => parseEntry(r.data)),
  updateEntry: (id: number, data: CreateEntryInput) =>
    client.put<ExpenseEntryRaw>(`/expenses/entries/${id}`, data).then(r => parseEntry(r.data)),
  deleteEntry: (id: number) => client.delete(`/expenses/entries/${id}`),

  importPreview: (file: File, password?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (password) form.append('password', password)
    return client.post<ImportPreviewResult>('/expenses/import/preview', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  importConfirm: (transactions: unknown[], overrideYear?: number, overrideMonth?: number) =>
    client.post<ImportConfirmResult>('/expenses/import/confirm', {
      transactions, override_year: overrideYear, override_month: overrideMonth,
    }).then(r => r.data),

  // Pending statements (detected from the Gmail digest)
  getPendingStatements: (states?: PendingStatementState[]) =>
    client.get<PendingStatement[]>('/expenses/pending-statements', {
      params: states?.length ? { state: states.join(',') } : undefined,
    }).then(r => r.data),
  preparePendingStatement: (id: number, password?: string) =>
    client.post<PreparePendingResult>(`/expenses/pending-statements/${id}/prepare`,
      password ? { password } : {}).then(r => r.data),
  updatePendingStatement: (id: number, state: PendingStatementState, importedMonthId?: number) =>
    client.patch<PendingStatement>(`/expenses/pending-statements/${id}`, {
      state, imported_month_id: importedMonthId,
    }).then(r => r.data),
}
