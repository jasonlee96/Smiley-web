import client from './client'
import type { Todo, CreateTodoInput } from '../types/todos'

export const todosApi = {
  getToday: () => client.get<Todo[]>('/todos/today').then(r => r.data),
  getAll: (start?: string, end?: string) =>
    client.get<Todo[]>('/todos', { params: { start, end } }).then(r => r.data),
  getWorkload: () => client.get<{ summary: string }>('/todos/workload').then(r => r.data),
  create: (data: CreateTodoInput) => client.post<Todo>('/todos', data).then(r => r.data),
  update: (id: number, data: Partial<Todo>) => client.put<Todo>(`/todos/${id}`, data).then(r => r.data),
  remove: (id: number) => client.delete(`/todos/${id}`).then(r => r.data),
}
