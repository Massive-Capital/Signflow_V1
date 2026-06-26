import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { getErrorMessage, toast } from '../utils/toast'

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: api.apiKeys.list,
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, environment }: { name: string; environment: 'production' | 'sandbox' }) =>
      api.apiKeys.create(name, environment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Unable to create API key.'))
    },
  })
}
