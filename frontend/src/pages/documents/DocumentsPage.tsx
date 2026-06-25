import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/common/LoadingState'
import { DocumentFilters } from '../../components/documents/DocumentFilters'
import { DocumentTable } from '../../components/documents/DocumentTable'
import { useDocuments } from '../../hooks/useDocuments'
import { useDeleteDocument } from '../../hooks/useDocumentMutations'
import type { Document, DocumentStatus } from '../../types'

export function DocumentsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStatus = (searchParams.get('status') as DocumentStatus | null) ?? ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<DocumentStatus | ''>(initialStatus)
  const deleteDocument = useDeleteDocument()

  const { data: documents = [], isLoading } = useDocuments({
    search: search || undefined,
    status: status || undefined,
  })

  useEffect(() => {
    const next = new URLSearchParams()
    if (status) next.set('status', status)
    setSearchParams(next, { replace: true })
  }, [status, setSearchParams])

  const handleStatusChange = (value: DocumentStatus | '') => {
    setStatus(value)
  }

  const handleDelete = (document: Document) => {
    deleteDocument.mutate(document.id)
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="All documents you send appear here. Filter by Completed to see documents signed by your clients."
      />
      <DocumentFilters
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={handleStatusChange}
      />
      {isLoading ? (
        <LoadingState message="Loading documents..." />
      ) : (
        <DocumentTable
          documents={documents}
          onRowClick={(doc) => navigate(`/documents/${doc.id}`)}
          onDelete={handleDelete}
          deletingId={deleteDocument.isPending ? deleteDocument.variables : undefined}
          emptyMessage="No documents found. Create your first document to get started."
        />
      )}
    </div>
  )
}
