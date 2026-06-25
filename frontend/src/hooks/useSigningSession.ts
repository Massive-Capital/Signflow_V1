import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useSigningSession(token: string | undefined) {
  return useQuery({
    queryKey: ['signing-session', token],
    queryFn: () => api.signing.getSession(token!),
    enabled: !!token,
  })
}
