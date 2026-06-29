import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { getMachineIp } from '../utils/machineIp'

export function useSigningSession(token: string | undefined) {
  return useQuery({
    queryKey: ['signing-session', token],
    queryFn: async () => {
      await getMachineIp()
      return api.signing.getSession(token!)
    },
    enabled: !!token,
    refetchOnWindowFocus: true,
  })
}
