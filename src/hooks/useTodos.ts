import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { todosApi } from '../api/todos'
import type { CreateTodoInput, Todo } from '../types/todos'

// Refresh the list views after a mutation, but deliberately exclude
// ['todos', 'workload'] — that query triggers a Claude CLI call on the
// API, and invalidating it on every toggle/delete/drag made the whole
// page feel like it hung for 2-3s on each action.
function invalidateTodoLists(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['todos', 'today'] })
  qc.invalidateQueries({ queryKey: ['todos', 'all'] })
}

export function useTodos() {
  const qc = useQueryClient()

  const todayQuery = useQuery({
    queryKey: ['todos', 'today'],
    queryFn: todosApi.getToday,
    refetchInterval: 120_000,
  })

  const workloadQuery = useQuery({
    queryKey: ['todos', 'workload'],
    queryFn: todosApi.getWorkload,
    staleTime: 300_000,
  })

  const createMutation = useMutation({
    mutationFn: todosApi.create,
    onSuccess: () => invalidateTodoLists(qc),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Todo> }) => todosApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['todos', 'today'] })
      await qc.cancelQueries({ queryKey: ['todos', 'all'] })
      const prevToday = qc.getQueryData<Todo[]>(['todos', 'today'])
      const prevAll = qc.getQueryData<Todo[]>(['todos', 'all'])
      qc.setQueryData<Todo[]>(['todos', 'today'], old =>
        old?.map(t => t.id === id ? { ...t, ...data } : t) ?? []
      )
      qc.setQueryData<Todo[]>(['todos', 'all'], old =>
        old?.map(t => t.id === id ? { ...t, ...data } : t) ?? []
      )
      return { prevToday, prevAll }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevToday) qc.setQueryData(['todos', 'today'], ctx.prevToday)
      if (ctx?.prevAll) qc.setQueryData(['todos', 'all'], ctx.prevAll)
    },
    onSettled: () => invalidateTodoLists(qc),
  })

  const deleteMutation = useMutation({
    mutationFn: todosApi.remove,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['todos', 'today'] })
      const prev = qc.getQueryData<Todo[]>(['todos', 'today'])
      qc.setQueryData<Todo[]>(['todos', 'today'], old => old?.filter(t => t.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['todos', 'today'], ctx.prev)
    },
    onSettled: () => invalidateTodoLists(qc),
  })

  // Fetch all todos for calendar (no date filter — calendar navigates freely)
  const weekQuery = useQuery({
    queryKey: ['todos', 'all'],
    queryFn: () => todosApi.getAll(),
    refetchInterval: 120_000,
  })

  const scheduleMutation = useMutation({
    mutationFn: ({ id, planned_date, planned_date_end }: { id: number; planned_date: string | null; planned_date_end?: string | null }) =>
      todosApi.update(id, {
        planned_date: planned_date ?? undefined,
        planned_date_end: planned_date_end,  // preserve null so backend can clear it
      }),
    onMutate: async ({ id, planned_date, planned_date_end }) => {
      await qc.cancelQueries({ queryKey: ['todos', 'all'] })
      const prev = qc.getQueryData<Todo[]>(['todos', 'all'])
      qc.setQueryData<Todo[]>(['todos', 'all'], old =>
        old?.map(t => t.id === id
          ? { ...t, planned_date: planned_date ?? undefined, planned_date_end: planned_date_end ?? undefined }
          : t
        ) ?? []
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['todos', 'all'], ctx.prev)
    },
    onSettled: () => invalidateTodoLists(qc),
  })

  return { todayQuery, workloadQuery, weekQuery, createMutation, updateMutation, deleteMutation, scheduleMutation }
}
