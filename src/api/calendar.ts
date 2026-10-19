import client from './client'

export interface CalendarEvent {
  title: string
  day: string        // YYYY-MM-DD (MYT)
  start: string      // ISO timestamp, or YYYY-MM-DD for all-day
  end: string
  allDay: boolean
  location: string | null
  calendar: string
}

export interface UpcomingCalendar {
  configured: boolean
  events: CalendarEvent[]
  fetched_at: string | null
}

export const calendarApi = {
  // iCloud CalDAV can be slow on a cold cache — allow longer than the default 15s
  getUpcoming: (days = 3, refresh = false) =>
    client.get<UpcomingCalendar>('/calendar/upcoming', {
      params: { days, ...(refresh ? { refresh: 1 } : {}) },
      timeout: 30000,
    }).then(r => r.data),
}
