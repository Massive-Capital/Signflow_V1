import { apiFormRequest, apiBlobRequest, apiRequest } from './httpClient'
import { downloadBlob } from '../utils/pdf'
import type {
  ApiKey,
  DashboardStats,
  Document,
  DocumentStatus,
  EmailAttachment,
  Invoice,
  ProfileType,
  TeamMember,
  User,
  Webhook,
} from '../types'

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiRequest<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (email: string, name: string, password: string) =>
      apiRequest<{ email: string; name: string; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, name, password }),
      }),

    forgotPassword: (email: string) =>
      apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token: string, password: string) =>
      apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),
  },

  dashboard: {
    getStats: () => apiRequest<DashboardStats>('/dashboard/stats'),
  },

  documents: {
    list: (filters?: { status?: DocumentStatus; search?: string }) =>
      apiRequest<Document[]>(`/documents${buildQuery(filters ?? {})}`),

    get: (id: string) => apiRequest<Document>(`/documents/${id}`),

    create: (title: string, pages?: number) =>
      apiRequest<Document>('/documents', {
        method: 'POST',
        body: JSON.stringify({ title, pages }),
      }),

    createWithFile: (title: string, file: File, pages: number) => {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('pages', String(pages))
      formData.append('file', file)
      return apiFormRequest<Document>('/documents', formData)
    },

    uploadFile: (id: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiFormRequest<Document>(`/documents/${id}/file`, formData)
    },

    update: (id: string, data: Partial<Document>) =>
      apiRequest<Document>(`/documents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    uploadEmailAttachment: (id: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiFormRequest<EmailAttachment>(
        `/documents/${id}/email-attachments`,
        formData,
      )
    },

    deleteEmailAttachment: (id: string, attachmentId: string) =>
      apiRequest<void>(`/documents/${id}/email-attachments/${attachmentId}`, {
        method: 'DELETE',
      }),

    delete: (id: string) =>
      apiRequest<void>(`/documents/${id}`, {
        method: 'DELETE',
      }),

    previewSigned: (id: string) => apiBlobRequest(`/documents/${id}/preview`),

    downloadSigned: async (id: string, title: string) => {
      const blob = await apiBlobRequest(`/documents/${id}/download`)
      await downloadBlob(blob, `${title}-signed.pdf`)
    },

    previewRecipient: (documentId: string, recipientId: string) =>
      apiBlobRequest(`/documents/${documentId}/recipients/${recipientId}/preview`),

    downloadRecipient: async (
      documentId: string,
      recipientId: string,
      filename: string,
    ) => {
      const blob = await apiBlobRequest(`/documents/${documentId}/recipients/${recipientId}/download`)
      await downloadBlob(blob, filename)
    },
  },

  teams: {
    list: () => apiRequest<TeamMember[]>('/teams/members'),
  },

  billing: {
    getInvoices: () => apiRequest<Invoice[]>('/billing/invoices'),
    getUsage: () =>
      apiRequest<{
        apiCalls: number
        embeddedSessions: number
        documentsSigned: number
        limit: number
      }>('/billing/usage'),
  },

  apiKeys: {
    list: () => apiRequest<ApiKey[]>('/api-keys'),
    create: (name: string, environment: ApiKey['environment']) =>
      apiRequest<ApiKey>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name, environment }),
      }),
  },

  webhooks: {
    list: () => apiRequest<Webhook[]>('/webhooks'),
    create: (url: string, events: string[]) =>
      apiRequest<Webhook>('/webhooks', {
        method: 'POST',
        body: JSON.stringify({ url, events }),
      }),
  },

  signing: {
    getSession: (token: string) =>
      apiRequest<{
        document: Document
        recipientId: string
        investorRecipientId?: string
        token: string
      }>(`/signing/sessions/${token}`),

    setProfile: (token: string, profileType: ProfileType) =>
      apiRequest<{ success: boolean; profileType: ProfileType }>(
        `/signing/sessions/${token}/profile`,
        {
          method: 'POST',
          body: JSON.stringify({ profileType }),
        },
      ),

    complete: (token: string, fieldValues?: Record<string, string>) =>
      apiRequest<{ success: boolean; timestamp: string }>(
        `/signing/sessions/${token}/complete`,
        {
          method: 'POST',
          body: JSON.stringify({ fieldValues }),
        },
      ),

    previewSigned: (token: string) =>
      apiBlobRequest(`/signing/sessions/${token}/preview`),
  },
}
