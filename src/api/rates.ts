import client from './client'
import type { RateLatest, RateDaily, FxRecommendationResponse } from '../types/rates'

export const ratesApi = {
  getLatest: () => client.get<RateLatest>('/rates/latest').then(r => r.data),
  getDaily: (days = 30) =>
    client.get<RateDaily[]>('/rates/daily').then(r => r.data.slice(-days)),
  getRecommendation: (params: { amount: number; urgency: 'low' | 'medium' | 'high' }) =>
    client.get<FxRecommendationResponse>('/rates/recommendation', { params }).then(r => r.data),
}
