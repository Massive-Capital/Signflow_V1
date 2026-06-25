import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Pencil, Send, Trash2 } from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { Tooltip } from '../ui/Tooltip'
import { ConfirmModal } from '../ui/Modal'
import { Table, type Column } from '../ui/Table'
import { StatusBadge } from '../common/StatusBadge'
import { formatDisplayDate } from '../../utils/date'
import { canSendForSignature, getSendDisabledReason } from '../../utils/documentSend'
import { getDocumentStatusTimestamp } from '../../utils/recipientSigningStatus'
import type { Document } from '../../types'

const DOCUMENT_STATUS_ORDER: Record<Document['status'], number> = {
  draft: 0,
  sent: 1,
  pending: 2,
  completed: 3,
  declined: 4,
}

interface DocumentTableProps {
  documents: Document[]
  onRowClick: (document: Document) => void
  onDelete: (document: Document) => void
  deletingId?: string
  emptyMessage?: string
}

export function DocumentTable({
  documents,
  onRowClick,
  onDelete,
  deletingId,
  emptyMessage,
}: DocumentTableProps) {
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [deleteRequested, setDeleteRequested] = useState(false)

  useEffect(() => {
    if (!deleteRequested || !documentToDelete || deletingId) return
    setDocumentToDelete(null)
    setDeleteRequested(false)
  }, [deleteRequested, documentToDelete, deletingId])

  const handleDeleteConfirm = () => {
    if (!documentToDelete || deletingId === documentToDelete.id) return
    onDelete(documentToDelete)
    setDeleteRequested(true)
  }

  const handleDeleteCancel = () => {
    if (documentToDelete && deletingId === documentToDelete.id) return
    setDocumentToDelete(null)
    setDeleteRequested(false)
  }

  const columns: Column<Document>[] = [
    {
      key: 'title',
      header: 'Title',
      sortValue: (row) => row.title.toLowerCase(),
      render: (row) => <strong>{row.title}</strong>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortValue: (row) => DOCUMENT_STATUS_ORDER[row.status],
      render: (row) => {
        const timestamp = getDocumentStatusTimestamp(row.status, row)
        return (
          <StatusBadge status={row.status} timestamp={timestamp} />
        )
      },
    },
    {
      key: 'recipients',
      header: 'Recipients',
      align: 'center',
      sortValue: (row) => row.recipients.length,
      render: (row) => row.recipients.length,
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      align: 'center',
      sortValue: (row) => new Date(row.updatedAt).getTime(),
      render: (row) => formatDisplayDate(row.updatedAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      sortable: false,
      render: (row) => {
        const isDeleting = deletingId === row.id

        return (
          <div className="table-actions" onClick={(e) => e.stopPropagation()}>
            <Tooltip label="Edit">
              <Link
                to={`/documents/${row.id}/builder`}
                className="btn btn-ghost btn-sm btn-icon-only"
                aria-label="Edit"
              >
                <Pencil className="btn-icon" size={16} strokeWidth={2} aria-hidden />
              </Link>
            </Tooltip>

            {canSendForSignature(row) ? (
              <Tooltip label="Send for signature">
                <Link
                  to={`/documents/${row.id}/send`}
                  className="btn btn-primary btn-sm btn-icon-only"
                  aria-label="Send for signature"
                >
                  <Send className="btn-icon" size={16} strokeWidth={2} aria-hidden />
                </Link>
              </Tooltip>
            ) : row.status !== 'completed' && row.status !== 'declined' ? (
              <Tooltip label={getSendDisabledReason(row) ?? 'Send for signature'}>
                <span className="btn btn-primary btn-sm btn-icon-only" aria-disabled="true">
                  <Send className="btn-icon" size={16} strokeWidth={2} aria-hidden />
                </span>
              </Tooltip>
            ) : null}

            <Tooltip label={isDeleting ? 'Deleting...' : 'Delete'}>
              <IconButton
                icon={isDeleting ? Loader2 : Trash2}
                label="Delete"
                variant="danger"
                disabled={isDeleting}
                className={isDeleting ? 'btn-spinning' : ''}
                onClick={() => setDocumentToDelete(row)}
              />
            </Tooltip>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <Table
        columns={columns}
        data={documents}
        keyField="id"
        onRowClick={onRowClick}
        emptyMessage={emptyMessage}
        defaultSort={{ key: 'updatedAt', direction: 'desc' }}
      />

      <ConfirmModal
        open={documentToDelete !== null}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete document"
        message={
          documentToDelete
            ? `Are you sure you want to delete "${documentToDelete.title}"? This action cannot be undone.`
            : ''
        }
        confirmLabel={
          documentToDelete && deletingId === documentToDelete.id ? 'Deleting...' : 'Delete'
        }
        confirmDisabled={documentToDelete !== null && deletingId === documentToDelete.id}
        danger
      />
    </>
  )
}
