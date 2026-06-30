export function getEmbedParentOrigin(): string | undefined {
  if (typeof window === 'undefined') return undefined

  const fromQuery = new URLSearchParams(window.location.search).get('parentOrigin')?.trim()
  if (fromQuery) {
    try {
      return new URL(fromQuery).origin
    } catch {
      return undefined
    }
  }

  if (document.referrer) {
    try {
      return new URL(document.referrer).origin
    } catch {
      return undefined
    }
  }

  return undefined
}

export function getEmbedRequestHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const parentOrigin = getEmbedParentOrigin()
  return {
    'X-SignFlow-Embed': '1',
    ...(parentOrigin ? { 'X-SignFlow-Parent-Origin': parentOrigin } : {}),
  }
}
