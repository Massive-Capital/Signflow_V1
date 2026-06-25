import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import DocumentBuilderPage from '../pages/documents/DocumentBuilderPage'

/** API-key template URLs must use /embed/... so the iframe shows builder-only UI. */
export function DocumentBuilderRoute() {
  const { id = '' } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const apiKey = searchParams.get('apiKey')?.trim()

  if (apiKey && id) {
    const query = searchParams.toString()
    return <Navigate to={`/embed/documents/${id}/builder${query ? `?${query}` : ''}`} replace />
  }

  return <DocumentBuilderPage />
}
