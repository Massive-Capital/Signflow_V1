import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuthReady } from '../stores/authStore'
import type { DocumentStatus } from '../types'

export function useDocuments(filters?: { search?: string; status?: DocumentStatus }) {
  const authReady = useAuthReady()

  return useQuery({
    queryKey: ['documents', filters?.search, filters?.status],
    queryFn: () => api.documents.list(filters),
    enabled: authReady,
    refetchOnWindowFocus: true,
  })
}

export function useDocument(id: string | undefined) {
  const authReady = useAuthReady()
  const embedReady = typeof window !== 'undefined' && window.location.pathname.startsWith('/embed/')

  return useQuery({
    queryKey: ['document', id],
    queryFn: () => api.documents.get(id!),
    enabled: (authReady || embedReady) && !!id,
    refetchOnWindowFocus: true,
  })
}
