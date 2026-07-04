import client from './client'
import type { RateLatest, RateDaily } from '../types/rates'

export const ratesApi = {
  getLatest: () => client.get<RateLatest>('/rates/latest').then(r => r.data),
  getDaily: (days = 30) =>
    client.get<RateDaily[]>('/rates/daily').then(r => r.data.slice(-days)),
}
