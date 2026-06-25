import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: api.webhooks.list,
  })
}

export function useCreateWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (url: string) => api.webhooks.create(url, ['document.completed']),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  })
}
