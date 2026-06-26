import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { getPdfPageCount } from '../utils/pdf'
import { getErrorMessage, toast } from '../utils/toast'
import type { Document } from '../types'

interface CreateDocumentInput {
  title: string
  file: File
}

export function useUpdateDocument(documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Document>) => api.documents.update(documentId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['document', documentId] })
      const previous = queryClient.getQueryData<Document>(['document', documentId])
      if (previous) {
        queryClient.setQueryData<Document>(['document', documentId], {
          ...previous,
          ...data,
        })
      }
      return { previous }
    },
    onError: (error, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['document', documentId], context.previous)
      }
      toast.error(getErrorMessage(error, 'Unable to save document changes.'))
    },
    onSuccess: (updatedDocument) => {
      queryClient.setQueryData(['document', documentId], updatedDocument)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ title, file }: CreateDocumentInput) => {
      const pages = await getPdfPageCount(file)
      return api.documents.createWithFile(title, file, pages)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Unable to create document.'))
    },
  })
}

export function useUploadDocumentFile(documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => api.documents.uploadFile(documentId, file),
    onSuccess: (updatedDocument) => {
      queryClient.setQueryData(['document', documentId], updatedDocument)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Unable to upload document file.'))
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => api.documents.delete(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Document deleted.')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Unable to delete document.'))
    },
  })
}
