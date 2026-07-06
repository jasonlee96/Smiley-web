import client from './client'
import type { RateLatest, RateDaily, FxRecommendationResponse, FxProfile } from '../types/rates'

export const ratesApi = {
  getLatest: () => client.get<RateLatest>('/rates/latest').then(r => r.data),
  getDaily: (days = 30) =>
    client.get<RateDaily[]>('/rates/daily').then(r => r.data.slice(-days)),
  getRecommendation: (params: { amount: number; urgency: 'low' | 'medium' | 'high' }) =>
    client.get<FxRecommendationResponse>('/rates/recommendation', { params }).then(r => r.data),
  getProfile: () => client.get<FxProfile>('/rates/profile').then(r => r.data),
  updateProfile: (patch: Partial<Pick<FxProfile, 'target_rate' | 'fee_fixed' | 'fee_percent' | 'enabled' | 'name'>>) =>
    client.put<FxProfile>('/rates/profile', patch).then(r => r.data),
}
