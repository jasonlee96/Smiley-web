import { useQuery } from '@tanstack/react-query'
import { calendarApi } from '../api/calendar'

export function useUpcomingCalendar(days = 3) {
  return useQuery({
    queryKey: ['calendar', 'upcoming', days],
    queryFn: () => calendarApi.getUpcoming(days),
    staleTime: 600_000, // matches server cache
    retry: 1,
  })
}
