import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ec2Api } from '../api/ec2'

export function useEC2() {
  const qc = useQueryClient()

  const instanceQuery = useQuery({
    queryKey: ['ec2', 'instance'],
    queryFn: ec2Api.getInstance,
    refetchInterval: (query) => {
      const state = query.state.data?.state
      return state === 'pending' || state === 'stopping' ? 10_000 : 30_000
    },
  })

  const utilizationQuery = useQuery({
    queryKey: ['ec2', 'utilization'],
    queryFn: ec2Api.getUtilization,
    refetchInterval: 60_000,
  })

  const schedulesQuery = useQuery({
    queryKey: ['ec2', 'schedules'],
    queryFn: ec2Api.getSchedules,
  })

  const startMutation = useMutation({
    mutationFn: ec2Api.start,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ec2'] }),
  })

  const stopMutation = useMutation({
    mutationFn: ec2Api.stop,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ec2'] }),
  })

  const toggleScheduleMutation = useMutation({
    mutationFn: ({ group, name, state }: { group: string; name: string; state: 'ENABLED' | 'DISABLED' }) =>
      ec2Api.toggleSchedule(group, name, state),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ec2', 'schedules'] }),
  })

  return {
    instanceQuery,
    utilizationQuery,
    schedulesQuery,
    startMutation,
    stopMutation,
    toggleScheduleMutation,
  }
}
