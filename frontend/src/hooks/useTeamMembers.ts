import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: api.teams.list,
  })
}
