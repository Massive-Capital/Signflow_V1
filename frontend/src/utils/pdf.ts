import { API_BASE_URL } from '../config/env'
import { formatDateFieldValue } from './date'
import { getMachineIpHeaders } from './machineIp'
import { getEmbedApiKey, isEmbedPortalRoute, readEmbedApiKeyFromSearch } from '../api/embedAuth'
import { getEmbedRequestHeaders } from './embedHeaders'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024

export function resolveDocumentFileUrl(fileUrl: string): string {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
  const normalizedPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
  return `${apiOrigin}${normalizedPath}`
}

export function getDocumentFileUrl(documentId: string, fileUrl?: string): string | undefined {
  if (fileUrl) {
    if (isSigningSessionFileUrl(fileUrl)) {
      return resolveDocumentFileUrl(fileUrl)
    }

    const legacyMatch = fileUrl.match(/\/files\/documents\/([^/]+)\.pdf/)
    if (legacyMatch) {
      return resolveDocumentFileUrl(`/api/v1/documents/${legacyMatch[1]}/file`)
    }
    return resolveDocumentFileUrl(fileUrl)
  }
  return resolveDocumentFileUrl(`/api/v1/documents/${documentId}/file`)
}

export function isSigningSessionFileUrl(fileUrl: string): boolean {
  return fileUrl.includes('/signing/sessions/') && fileUrl.includes('/file')
}

export function getSigningDocumentFileUrl(token: string): string {
  const encodedToken = encodeURIComponent(token)
  return resolveDocumentFileUrl(`/api/v1/signing/sessions/${encodedToken}/file`)
}

export function resolveSigningDocumentFileUrl(
  signingToken?: string,
  documentId?: string,
  fileUrl?: string,
): string | undefined {
  if (signingToken) {
    return getSigningDocumentFileUrl(signingToken)
  }
  if (!documentId) return undefined
  return getDocumentFileUrl(documentId, fileUrl)
}

function requiresAuthenticatedPdfFetch(resolvedUrl: string): boolean {
  if (isSigningSessionFileUrl(resolvedUrl)) return false
  return resolvedUrl.includes('/api/v1/documents/') && resolvedUrl.includes('/file')
}

export async function fetchPdfArrayBuffer(fileUrl: string): Promise<ArrayBuffer> {
  const url = resolveDocumentFileUrl(fileUrl)
  const headers: Record<string, string> = {}

  if (requiresAuthenticatedPdfFetch(url)) {
    const embedKey =
      getEmbedApiKey() ??
      (isEmbedPortalRoute() ? readEmbedApiKeyFromSearch(window.location.search) : null)
    if (embedKey) {
      headers.Authorization = `Bearer ${embedKey}`
    }
  }

  if (isEmbedPortalRoute() && isSigningSessionFileUrl(url)) {
    Object.assign(headers, getEmbedRequestHeaders())
  }

  Object.assign(headers, await getMachineIpHeaders())

  const response = await fetch(url, {
    headers,
    credentials: requiresAuthenticatedPdfFetch(url) ? 'include' : 'omit',
  })
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Document file not found. Please upload the PDF again.')
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('You do not have permission to view this document.')
    }
    throw new Error('Failed to load document file')
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    throw new Error('Document file could not be loaded from the server.')
  }

  return response.arrayBuffer()
}

export async function loadPdfDocument(fileUrl: string): Promise<PDFDocumentProxy> {
  const data = await fetchPdfArrayBuffer(fileUrl)
  return getDocument({ data }).promise
}

const pdfDocumentCache = new Map<string, Promise<PDFDocumentProxy>>()

/** Cached PDF load — avoids re-fetching on canvas resize / field overlay updates. */
export function loadPdfDocumentCached(fileUrl: string): Promise<PDFDocumentProxy> {
  const resolved = resolveDocumentFileUrl(fileUrl)
  const cached = pdfDocumentCache.get(resolved)
  if (cached) return cached

  const pending = loadPdfDocument(fileUrl).catch((error) => {
    pdfDocumentCache.delete(resolved)
    throw error
  })
  pdfDocumentCache.set(resolved, pending)
  return pending
}

export function clearPdfDocumentCache(fileUrl?: string): void {
  if (!fileUrl) {
    pdfDocumentCache.clear()
    return
  }
  pdfDocumentCache.delete(resolveDocumentFileUrl(fileUrl))
}

export function validatePdfFile(file: File): string | null {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  if (!isPdf) {
    return 'Only PDF files are allowed'
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return 'File must be 25MB or smaller'
  }

  return null
}

export async function getPdfPageCount(file: File): Promise<number> {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise
  return pdf.numPages
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function sanitizeDownloadFilename(title: string): string {
  const cleaned = title.replace(/[<>:"/\\|?*]+/g, '_').trim()
  return cleaned || 'document'
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const objectUrl = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = objectUrl
  link.download = sanitizeDownloadFilename(filename.replace(/\.pdf$/i, '')) + '.pdf'
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

/** Open a blank tab synchronously so async blob loads are not blocked as pop-ups. */
export function openPreviewTab(): Window | null {
  // Do not pass noopener here — browsers return null when noopener is set,
  // which breaks our ability to set location.href after the async PDF fetch.
  const previewTab = window.open('about:blank', '_blank')
  if (previewTab) {
    previewTab.opener = null
  }
  return previewTab
}

export function showBlobInPreviewTab(
  blob: Blob,
  previewTab: Window | null,
  title?: string,
): boolean {
  if (!previewTab || previewTab.closed) {
    return false
  }

  const objectUrl = URL.createObjectURL(blob)
  previewTab.location.href = objectUrl
  if (title) {
    try {
      previewTab.document.title = title
    } catch {
      // Ignore cross-origin title errors; the PDF still opens.
    }
  }
  return true
}

export function createPdfPreviewObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export function revokePdfPreviewObjectUrl(objectUrl: string): void {
  URL.revokeObjectURL(objectUrl)
}

export function formatFieldDisplayValue(value: string): string {
  if (value.startsWith('typed:')) return value.slice('typed:'.length)
  if (value.startsWith('uploaded:')) return value.slice('uploaded:'.length)
  if (value.startsWith('drawn:')) return 'Signed'
  return formatDateFieldValue(value)
}

export function getSignatureImageSrc(value: string): string | null {
  if (value.startsWith('drawn:')) return value.slice('drawn:'.length)
  return null
}

export async function downloadDocumentCopy(
  documentId: string,
  title: string,
  fileUrl?: string,
): Promise<void> {
  const url = getDocumentFileUrl(documentId, fileUrl)
  if (!url) {
    throw new Error('No document file available')
  }

  const buffer = await fetchPdfArrayBuffer(url)
  const blob = new Blob([buffer], { type: 'application/pdf' })
  await downloadBlob(blob, `${sanitizeDownloadFilename(title)}.pdf`)
}

export async function downloadSignedDocumentCopy(token: string, title: string): Promise<void> {
  const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
  const machineIpHeaders = await getMachineIpHeaders()
  const response = await fetch(`${apiOrigin}/api/v1/signing/sessions/${token}/download`, {
    headers: machineIpHeaders,
  })

  if (!response.ok) {
    throw new Error('Failed to download signed document')
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = objectUrl
  link.download = `${sanitizeDownloadFilename(title)}-signed.pdf`
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

export interface SigningCompletionInfo {
  documentId: string
  title: string
  fileUrl?: string
  token?: string
  completedAt: string
}

const COMPLETION_STORAGE_KEY = 'signflow_completion'

export function saveSigningCompletion(info: SigningCompletionInfo): void {
  sessionStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(info))
}

export function loadSigningCompletion(): SigningCompletionInfo | null {
  const raw = sessionStorage.getItem(COMPLETION_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as SigningCompletionInfo
  } catch {
    return null
  }
}
