import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gmailApi } from '../api/gmail'

export function useGmailDigest() {
  return useQuery({
    queryKey: ['gmail', 'digest'],
    queryFn: gmailApi.getDigest,
    staleTime: 15 * 60 * 1000,
  })
}

export function useGmailAttention(days = 7) {
  return useQuery({
    queryKey: ['gmail', 'attention', days],
    queryFn: () => gmailApi.getAttention(days),
    staleTime: 15 * 60 * 1000,
  })
}

export function useGmailStatus() {
  return useQuery({
    queryKey: ['gmail', 'status'],
    queryFn: gmailApi.getStatus,
    staleTime: 5 * 60 * 1000,
  })
}

export function useGmailRefresh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: gmailApi.refresh,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmail', 'digest'] })
      qc.invalidateQueries({ queryKey: ['gmail', 'attention'] })
    },
  })
}

export function useGmailDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: gmailApi.disconnect,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gmail', 'status'] }),
  })
}
