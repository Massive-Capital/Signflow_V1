import { useEffect, useState } from 'react'
import { Download, Eye } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { RecipientSigningStatusBadge } from '../common/RecipientSigningStatusBadge'
import { formatRecipientRole } from '../../constants/fieldTypes'
import { api } from '../../api/client'
import {
  createPdfPreviewObjectUrl,
  openPreviewTab,
  revokePdfPreviewObjectUrl,
  showBlobInPreviewTab,
} from '../../utils/pdf'
import { shouldShowRecipientSigningStatus, getRecipientSigningTimestamp } from '../../utils/recipientSigningStatus'
import { sortRecipientsByOrder } from '../../utils/signingOrder'
import type { DocumentField, DocumentStatus, Recipient, WorkflowType } from '../../types'

interface DocumentRecipientListProps {
  documentId: string
  documentTitle: string
  documentStatus: DocumentStatus
  workflowType?: WorkflowType
  recipients: Recipient[]
  fields: DocumentField[]
}

function recipientFilledCount(recipientId: string, fields: DocumentField[]): number {
  return fields.filter((field) => field.recipientId === recipientId && field.value).length
}

function recipientFieldCount(recipientId: string, fields: DocumentField[]): number {
  return fields.filter((field) => field.recipientId === recipientId).length
}

export function DocumentRecipientList({
  documentId,
  documentTitle,
  documentStatus,
  workflowType,
  recipients,
  fields,
}: DocumentRecipientListProps) {
  const [loadingRecipientId, setLoadingRecipientId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [inlinePreview, setInlinePreview] = useState<{ title: string; url: string } | null>(
    null,
  )

  const showActions = ['sent', 'pending', 'completed'].includes(documentStatus)

  useEffect(() => {
    return () => {
      if (inlinePreview?.url) {
        revokePdfPreviewObjectUrl(inlinePreview.url)
      }
    }
  }, [inlinePreview?.url])

  const closeInlinePreview = () => {
    setInlinePreview((current) => {
      if (current?.url) {
        revokePdfPreviewObjectUrl(current.url)
      }
      return null
    })
  }

  const handlePreview = async (recipient: Recipient) => {
    if (!recipient.signed) return

    const previewTab = openPreviewTab()
    const useInlinePreview = !previewTab

    setLoadingRecipientId(recipient.id)
    setActionError(null)

    try {
      const blob = await api.documents.previewRecipient(documentId, recipient.id)
      const previewTitle = `${documentTitle} — ${recipient.name}`

      if (useInlinePreview) {
        setInlinePreview((current) => {
          if (current?.url) {
            revokePdfPreviewObjectUrl(current.url)
          }
          return {
            title: previewTitle,
            url: createPdfPreviewObjectUrl(blob),
          }
        })
        return
      }

      const opened = showBlobInPreviewTab(blob, previewTab, previewTitle)
      if (!opened) {
        previewTab?.close()
        setInlinePreview((current) => {
          if (current?.url) {
            revokePdfPreviewObjectUrl(current.url)
          }
          return {
            title: previewTitle,
            url: createPdfPreviewObjectUrl(blob),
          }
        })
      }
    } catch {
      previewTab?.close()
      setActionError(`Unable to preview the document for ${recipient.name}.`)
    } finally {
      setLoadingRecipientId(null)
    }
  }

  const handleDownload = async (recipient: Recipient) => {
    if (!recipient.signed) return

    setLoadingRecipientId(recipient.id)
    setActionError(null)

    try {
      const safeTitle = documentTitle.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'document'
      const safeName = recipient.name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'recipient'
      await api.documents.downloadRecipient(
        documentId,
        recipient.id,
        `${safeTitle}-${safeName}-signed.pdf`,
      )
    } catch {
      setActionError(`Unable to download the document for ${recipient.name}.`)
    } finally {
      setLoadingRecipientId(null)
    }
  }

  const orderedRecipients =
    workflowType === 'sequential' ? sortRecipientsByOrder(recipients) : recipients

  if (orderedRecipients.length === 0) {
    return <p className="field-list-empty-state">No recipients assigned</p>
  }

  return (
    <>
      <Modal
        open={Boolean(inlinePreview)}
        onClose={closeInlinePreview}
        title={inlinePreview?.title ?? 'Document preview'}
        size="lg"
      >
        {inlinePreview && (
          <iframe
            className="recipient-pdf-preview"
            src={inlinePreview.url}
            title={inlinePreview.title}
          />
        )}
      </Modal>

      {actionError && <p className="document-download-error">{actionError}</p>}

      <ul className="recipient-list">
        {orderedRecipients.map((recipient, index) => {
          const filled = recipientFilledCount(recipient.id, fields)
          const total = recipientFieldCount(recipient.id, fields)
          const isLoading = loadingRecipientId === recipient.id
          const canAccessSignedCopy = Boolean(recipient.signed)
          const disabledTitle = canAccessSignedCopy
            ? 'Opens signed PDF in a new tab'
            : recipient.role === 'seller' &&
                recipient.signingStatus === 'awaiting_countersign'
              ? 'Complete counter-signature using the email sent after the investor signed'
              : 'Available after this recipient signs'

          return (
            <li key={recipient.id} style={{ borderLeftColor: recipient.color }}>
              <div className="recipient-list-main">
                <div className="recipient-list-title-row">
                  <div className="recipient-list-title-group">
                    {workflowType === 'sequential' && (
                      <span
                        className="recipient-list-sequence"
                        aria-label={`Signing order ${index + 1}`}
                      >
                        {index + 1}
                      </span>
                    )}
                    <strong className="recipient-list-label">{recipient.name}</strong>
                  </div>
                  {shouldShowRecipientSigningStatus(documentStatus, recipient.signingStatus) &&
                    recipient.signingStatus && (
                      <RecipientSigningStatusBadge
                        status={recipient.signingStatus}
                        timestamp={getRecipientSigningTimestamp(
                          recipient.signingStatus,
                          recipient,
                        )}
                      />
                    )}
                </div>

                <div className="recipient-list-meta">
                  <span className="recipient-list-role-chip">{formatRecipientRole(recipient.role)}</span>
                  <span className="recipient-list-meta-text">{recipient.email}</span>
                  {showActions && total > 0 && recipient.signingStatus !== 'signed' && (
                    <span className="recipient-list-field-count">
                      {`${filled} of ${total} field${total === 1 ? '' : 's'} completed`}
                    </span>
                  )}
                </div>

                {showActions && (
                  <div className="recipient-list-actions">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={Eye}
                      disabled={!canAccessSignedCopy || isLoading}
                      title={disabledTitle}
                      onClick={() => handlePreview(recipient)}
                    >
                      Preview
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      icon={Download}
                      disabled={!canAccessSignedCopy || isLoading}
                      title={
                        canAccessSignedCopy
                          ? undefined
                          : 'Available after this recipient signs'
                      }
                      onClick={() => handleDownload(recipient)}
                    >
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
