import client from './client'

export interface Job {
  id: string
  name: string
  schedule: string
  lastRun: string | null
  nextRun: string | null
  status: 'ok' | 'stale' | 'unknown'
}

export const jobsApi = {
  getStatus: () => client.get<Job[]>('/jobs/status').then(r => r.data),
  trigger: (id: string) => client.post(`/jobs/run/${id}`).then(r => r.data),
}
