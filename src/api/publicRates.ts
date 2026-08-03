import axios from 'axios'
import type { RateLatest, RateDaily } from '../types/rates'

const publicRatesClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://ip-172-31-2-167.tail9203bc.ts.net/api',
  timeout: 15000,
})

export const publicRatesApi = {
  getLatest: () => publicRatesClient.get<RateLatest>('/rates/public/latest').then(r => r.data),
  getDaily: (days = 30) =>
    publicRatesClient.get<RateDaily[]>('/rates/public/daily').then(r => r.data.slice(-days)),
}
