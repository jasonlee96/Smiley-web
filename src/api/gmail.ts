import client from './client'

export interface GmailEmail {
  index: number
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

export const GMAIL_AUTH_URL = 'https://ip-172-31-2-167.tail9203bc.ts.net/api/gmail/auth'

export const gmailApi = {
  getDigest: () =>
    client.get<{ digest: GmailDigest | null }>('/gmail/digest').then(r => r.data.digest),
  getStatus: () =>
    client.get<{ connected: boolean }>('/gmail/status').then(r => r.data),
  refresh: () =>
    client.post<{ digest: GmailDigest | null }>('/gmail/refresh').then(r => r.data.digest),
  disconnect: () =>
    client.delete('/gmail/connection').then(r => r.data),
}
