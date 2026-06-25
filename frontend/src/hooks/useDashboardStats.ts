import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.dashboard.getStats,
  })
}
