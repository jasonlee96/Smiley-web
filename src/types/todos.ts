export interface Todo {
  id: number
  title: string
  status: 'not_started' | 'in_progress' | 'done'
  workspace: 'work' | 'personal'
  due_date?: string
  planned_date?: string
  planned_date_end?: string | null
  notion_id?: string
  created_at: string
  updated_at: string
}

export interface CreateTodoInput {
  title: string
  workspace: 'work' | 'personal'
  due_date?: string
  planned_date?: string
  planned_date_end?: string | null
}
