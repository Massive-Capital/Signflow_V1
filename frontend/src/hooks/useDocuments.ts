import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuthReady } from '../stores/authStore'
import type { Document, DocumentStatus } from '../types'

const IN_PROGRESS_POLL_MS = 5000

function isInProgressDocument(document: Document): boolean {
  return document.status === 'sent' || document.status === 'pending'
}

export function useDocuments(filters?: { search?: string; status?: DocumentStatus }) {
  const authReady = useAuthReady()

  return useQuery({
    queryKey: ['documents', filters?.search, filters?.status],
    queryFn: () => api.documents.list(filters),
    enabled: authReady,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const documents = query.state.data
      if (!documents?.some(isInProgressDocument)) return false
      return IN_PROGRESS_POLL_MS
    },
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
    refetchInterval: (query) => {
      const document = query.state.data
      if (!document || !isInProgressDocument(document)) return false
      return IN_PROGRESS_POLL_MS
    },
  })
}
