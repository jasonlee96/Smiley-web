import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi } from '../api/jobs'

export function useJobs() {
  const qc = useQueryClient()

  const statusQuery = useQuery({
    queryKey: ['jobs', 'status'],
    queryFn: jobsApi.getStatus,
    refetchInterval: 30_000,
  })

  const triggerMutation = useMutation({
    mutationFn: (id: string) => jobsApi.trigger(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  return { statusQuery, triggerMutation }
}
