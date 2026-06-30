import { API_BASE_URL } from '../config/env'
import { getEmbedApiKey, isEmbedPortalRoute, readEmbedApiKeyFromSearch } from './embedAuth'
import { useAuthStore } from '../stores/authStore'
import { getMachineIpHeaders } from '../utils/machineIp'
import { getEmbedRequestHeaders } from '../utils/embedHeaders'
import type { User } from '../types'

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

let refreshInFlight: Promise<boolean> | null = null

function isAuthPath(path: string): boolean {
  return (
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/logout') ||
    path.startsWith('/auth/forgot-password') ||
    path.startsWith('/auth/reset-password') ||
    path.startsWith('/auth/verify-email') ||
    path.startsWith('/auth/resend-verification')
  )
}

function isPublicSigningPath(path: string): boolean {
  return path.startsWith('/signing/sessions/')
}

function isSigningPortalRoute(): boolean {
  return window.location.pathname.startsWith('/sign/')
}

function resolveEmbedApiKey(): string | null {
  const stored = getEmbedApiKey()
  if (stored) return stored
  if (!isEmbedPortalRoute()) return null
  return readEmbedApiKeyFromSearch(window.location.search)
}

async function tryRefreshToken(): Promise<boolean> {
  const { login, logout } = useAuthStore.getState()

  try {
    const machineIpHeaders = await getMachineIpHeaders()
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...machineIpHeaders },
      credentials: 'include',
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      logout()
      return false
    }

    const result = (await response.json()) as { user: User }
    login(result.user)
    return true
  } catch {
    logout()
    return false
  }
}

async function refreshTokenOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = tryRefreshToken().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function buildRequestHeaders(
  path: string,
  options: RequestInit,
  attachEmbedKey: boolean,
): Promise<Record<string, string>> {
  const isFormData = options.body instanceof FormData
  const machineIpHeaders = await getMachineIpHeaders()
  const embedHeaders = isEmbedPortalRoute() && isPublicSigningPath(path) ? getEmbedRequestHeaders() : {}

  return {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...machineIpHeaders,
    ...embedHeaders,
    ...(attachEmbedKey ? { Authorization: `Bearer ${resolveEmbedApiKey()}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }
}

async function sendRequest(path: string, options: RequestInit = {}, isRetry = false): Promise<Response> {
  const embedApiKey = resolveEmbedApiKey()
  const onEmbedRoute = isEmbedPortalRoute()
  const attachEmbedKey = Boolean(embedApiKey) && !isPublicSigningPath(path)
  const headers = await buildRequestHeaders(path, options, attachEmbedKey)

  const response = await fetch(buildUrl(path), {
    ...options,
    credentials: 'include',
    headers,
  })

  if (
    response.status === 401 &&
    !isRetry &&
    !isAuthPath(path) &&
    !isPublicSigningPath(path) &&
    !embedApiKey &&
    !onEmbedRoute
  ) {
    const refreshed = await refreshTokenOnce()
    if (refreshed) {
      return sendRequest(path, options, true)
    }

    if (
      window.location.pathname !== '/login' &&
      !isSigningPortalRoute() &&
      !isEmbedPortalRoute()
    ) {
      const redirect = `${window.location.pathname}${window.location.search}`
      window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`)
    }
  }

  return response
}

async function parseErrorMessage(response: Response): Promise<string> {
  let message = `API request failed (${response.status})`
  try {
    const body = (await response.json()) as { error?: { message?: string } }
    if (body.error?.message) message = body.error.message
  } catch {
    // ignore non-JSON error bodies
  }
  return message
}

export async function apiFormRequest<T>(path: string, formData: FormData): Promise<T> {
  const response = await sendRequest(path, { method: 'POST', body: formData })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json() as Promise<T>
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await sendRequest(path, options)

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function apiBlobRequest(path: string, options: RequestInit = {}): Promise<Blob> {
  const response = await sendRequest(path, options)

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.blob()
}

export { API_BASE_URL }
