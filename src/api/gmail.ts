import client from './client'

export interface GmailEmail {
  index: number
  id?: string | null
  from: string
  subject: string
  category: 'urgent' | 'important' | 'routine'
  reason: string
}

export interface GmailDigest {
  id: number
  digest_date: string
  email_count: number
  emails: GmailEmail[]
  summary: string | null
  created_at: string
  updated_at: string
}

// A merged urgent/important email across the last N days
export interface AttentionEmail {
  date: string            // YYYY-MM-DD — the digest day it arrived
  id: string | null
  from: string
  subject: string
  category: 'urgent' | 'important'
  reason: string
}

const gmailApiBase = import.meta.env.VITE_API_BASE_URL || 'https://ip-172-31-2-167.tail9203bc.ts.net/api'
export const GMAIL_AUTH_URL = `${gmailApiBase}/gmail/auth`

export const gmailApi = {
  getDigest: () =>
    client.get<{ digest: GmailDigest | null }>('/gmail/digest').then(r => r.data.digest),
  getAttention: (days = 7) =>
    client.get<{ days: number; items: AttentionEmail[] }>('/gmail/digests/attention', { params: { days } })
      .then(r => r.data.items),
  getStatus: () =>
    client.get<{ connected: boolean }>('/gmail/status').then(r => r.data),
  refresh: () =>
    client.post<{ digest: GmailDigest | null }>('/gmail/refresh').then(r => r.data.digest),
  disconnect: () =>
    client.delete('/gmail/connection').then(r => r.data),
}
