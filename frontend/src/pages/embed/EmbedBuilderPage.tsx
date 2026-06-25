import { useEffect, useLayoutEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { setEmbedApiKey } from '../../api/embedAuth'
import { EmbedDocumentBuilder } from './EmbedDocumentBuilder'
import './embed.css'

function notifyEmbedParent(event: string, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined' || window.parent === window) return
  window.parent.postMessage({ source: 'signflow-embed', event, ...payload }, '*')
}

export function EmbedBuilderPage() {
  const { id = '' } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const apiKey = searchParams.get('apiKey')?.trim() ?? ''

  useLayoutEffect(() => {
    if (apiKey) setEmbedApiKey(apiKey)
  }, [apiKey])

  useLayoutEffect(() => {
    document.documentElement.classList.add('signflow-embed-doc')
    document.body.classList.add('signflow-embed')
  }, [])

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('signflow-embed-doc')
      document.body.classList.remove('signflow-embed')
    }
  }, [])

  useEffect(() => {
    if (!apiKey) {
      notifyEmbedParent('builder-error', {
        message:
          'Missing SignFlow embed API key. Set SIGNFLOW_EMBED_API_KEY in the portal backend.',
      })
    }
  }, [apiKey])

  if (!apiKey) {
    return (
      <div className="embed-error">
        Missing SignFlow embed API key. Set <code>SIGNFLOW_EMBED_API_KEY</code> in the portal backend.
      </div>
    )
  }

  if (!id) {
    return <div className="embed-error">Missing document id.</div>
  }

  return (
    <div className="embed-shell">
      <EmbedDocumentBuilder />
    </div>
  )
}
