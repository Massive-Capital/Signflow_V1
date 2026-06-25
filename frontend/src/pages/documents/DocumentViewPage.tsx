import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '../../components/common/PageTitle'
import { LoadingState } from '../../components/common/LoadingState'
import { DocumentDetail } from '../../components/documents/DocumentDetail'
import { useDocument } from '../../hooks/useDocuments'

export function DocumentViewPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: document, isLoading } = useDocument(id)

  if (isLoading) {
    return (
      <>
        <PageTitle title="Document" />
        <LoadingState />
      </>
    )
  }

  if (!document) {
    return (
      <>
        <PageTitle title="Document Not Found" />
        <p>Document not found</p>
      </>
    )
  }

  return (
    <DocumentDetail
      document={document}
      onOpenBuilder={() => navigate(`/documents/${document.id}/builder`)}
      onSend={() => navigate(`/documents/${document.id}/send`)}
    />
  )
}
