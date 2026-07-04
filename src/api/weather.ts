import client from './client'

export interface WeatherLocation {
  id: number
  name: string
  query: string
  active: boolean
  created_at: string
}

export interface ForecastSlot {
  dt: number
  dt_txt: string
  pop: number
  main: { temp: number; feels_like: number; humidity: number; temp_min: number; temp_max: number }
  weather: { id: number; main: string; description: string; icon: string }[]
  wind: { speed: number; deg: number }
  clouds: { all: number }
  rain?: { '3h'?: number }
}

export interface WeatherSnapshot {
  id: number
  location_id: number
  location_name: string
  summary: string | null
  suggestion: string | null
  forecast_summary: string | null
  forecast_suggestion: string | null
  fetched_at: string
  owm_data: {
    main: { temp: number; feels_like: number; humidity: number; pressure: number; temp_min: number; temp_max: number }
    weather: { id: number; main: string; description: string; icon: string }[]
    wind: { speed: number; deg: number }
    clouds: { all: number }
    rain?: { '1h'?: number; '3h'?: number }
    visibility: number
  }
  forecast_data: { today: ForecastSlot[]; tomorrow: ForecastSlot[] } | ForecastSlot[] | null
}

export const weatherApi = {
  getLatest: () => client.get<WeatherSnapshot[]>('/weather').then(r => r.data),
  getLocations: () => client.get<WeatherLocation[]>('/weather/locations').then(r => r.data),
  getHistory: (locationId: number, days = 7) =>
    client.get<WeatherSnapshot[]>(`/weather/history/${locationId}`, { params: { days } }).then(r => r.data),
  refresh: () => client.post('/weather/refresh').then(r => r.data),
}
