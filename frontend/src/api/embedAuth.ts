let embedApiKey: string | null = null

export function isEmbedPortalRoute(pathname?: string): boolean {
  const path =
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  return path.startsWith('/embed/')
}

export function readEmbedApiKeyFromSearch(search: string): string | null {
  const key = new URLSearchParams(search).get('apiKey')?.trim()
  return key || null
}

/** Parse ?apiKey= from embed URLs before React mounts (avoids 401 → /login race). */
export function bootstrapEmbedAuthFromLocation(): void {
  if (typeof window === 'undefined') return
  if (!isEmbedPortalRoute()) return
  const key = readEmbedApiKeyFromSearch(window.location.search)
  if (key) setEmbedApiKey(key)
}

export function setEmbedApiKey(apiKey: string): void {
  embedApiKey = apiKey.trim() || null
}

export function getEmbedApiKey(): string | null {
  return embedApiKey
}

export function clearEmbedApiKey(): void {
  embedApiKey = null
}

export function isEmbedMode(): boolean {
  return Boolean(embedApiKey) || isEmbedPortalRoute()
}

if (typeof window !== 'undefined') {
  bootstrapEmbedAuthFromLocation()
}
