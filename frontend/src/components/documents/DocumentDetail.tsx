import { useEffect, useState } from 'react'
import { Download, Eye, Hammer, Loader2, Send } from 'lucide-react'
import { PageHeader } from '../common/PageHeader'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { DocumentRecipientList } from './DocumentRecipientList'
import { FieldList } from '../common/FieldList'
import { StatusBadge } from '../common/StatusBadge'
import { api } from '../../api/client'
import { formatDisplayDate, formatDisplayDateTime } from '../../utils/date'
import { isInvestorSponsorWorkflow } from '../../utils/investorSponsorWorkflow'
import { getWorkflowTypeLabel } from '../../utils/signingOrder'
import { canSendForSignature, getSendDisabledReason } from '../../utils/documentSend'
import { getDocumentStatusTimestamp } from '../../utils/recipientSigningStatus'
import {
  createPdfPreviewObjectUrl,
  openPreviewTab,
  revokePdfPreviewObjectUrl,
  showBlobInPreviewTab,
} from '../../utils/pdf'
import { toast } from '../../utils/toast'
import type { Document } from '../../types'

interface DocumentDetailProps {
  document: Document
  onOpenBuilder: () => void
  onSend: () => void
}

export function DocumentDetail({ document, onOpenBuilder, onSend }: DocumentDetailProps) {
  const [downloading, setDownloading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [inlinePreview, setInlinePreview] = useState<{ title: string; url: string } | null>(null)

  const isCompleted = document.status === 'completed'
  const isSentOrBeyond = ['sent', 'pending', 'completed'].includes(document.status)
  const usesInvestorSponsor = isInvestorSponsorWorkflow(document.recipients)
  const sponsor = document.recipients.find((recipient) => recipient.role === 'seller')
  const awaitingSponsorCountersign =
    usesInvestorSponsor &&
    isSentOrBeyond &&
    !isCompleted &&
    Boolean(sponsor) &&
    sponsor?.signingStatus === 'awaiting_countersign'
  const canAccessSignedPdf = isCompleted
  const canSend = canSendForSignature(document)
  const sendDisabledReason = getSendDisabledReason(document)

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

  const handlePreviewSigned = async () => {
    if (!canAccessSignedPdf) return

    const previewTab = openPreviewTab()
    const useInlinePreview = !previewTab

    setPreviewing(true)

    try {
      const blob = await api.documents.previewSigned(document.id)
      const previewTitle = `${document.title} — Fully Signed`

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
    } catch (error) {
      previewTab?.close()
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to preview the signed document. Please try again.',
      )
    } finally {
      setPreviewing(false)
    }
  }

  const handleDownloadSigned = async () => {
    if (!canAccessSignedPdf) return

    setDownloading(true)

    try {
      await api.documents.downloadSigned(document.id, document.title)
      toast.success('Signed PDF downloaded.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to download the signed document. Please try again.',
      )
    } finally {
      setDownloading(false)
    }
  }

  const completedTimestamp = getDocumentStatusTimestamp(document.status, document)
  const signedPdfDisabledTitle = canAccessSignedPdf
    ? undefined
    : awaitingSponsorCountersign
      ? 'Available after the sponsor completes counter-signature for all investors'
      : 'Available when all recipients have signed'

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

      <PageHeader
        back={`/documents`}
        title={document.title}
        description={
          <>
            <StatusBadge
              status={document.status}
              timestamp={completedTimestamp}
            />
            {' · '}Created {formatDisplayDate(document.createdAt)}
            {document.workflowType && isSentOrBeyond && (
              <>
                {' · '}
                {getWorkflowTypeLabel(document.workflowType)} workflow
              </>
            )}
          </>
        }
      />

      {isCompleted && (
        <div className="document-signed-banner">
          All recipients have signed this document
          {completedTimestamp && (
            <> on {formatDisplayDateTime(completedTimestamp)}</>
          )}
          . Use Preview or Download below for the fully signed PDF with all investor and sponsor
          signatures.
        </div>
      )}

      {awaitingSponsorCountersign && (
        <div className="document-pending-banner">
          Waiting for the sponsor to complete counter-signature for each investor who has signed. The
          full signed PDF will be available once counter-signing is finished.
        </div>
      )}

      {isSentOrBeyond && !isCompleted && !awaitingSponsorCountersign && (
        <div className="document-pending-banner">
          Waiting for all recipients to sign. The full signed PDF will be available once everyone
          has completed.
        </div>
      )}

      <div className="page-toolbar">
        <div className="page-toolbar-leading">
          {!isCompleted && (
            <Button variant="secondary" icon={Hammer} onClick={onOpenBuilder}>
              Open Builder
            </Button>
          )}
          {!isCompleted && (
            <Button
              variant="secondary"
              icon={Send}
              onClick={onSend}
              disabled={!canSend}
              title={sendDisabledReason}
            >
              Send for Signature
            </Button>
          )}
        </div>
        {isSentOrBeyond && (
          <div className="page-toolbar-trailing">
            <Button
              variant="secondary"
              icon={previewing ? Loader2 : Eye}
              className={previewing ? 'btn-spinning' : ''}
              onClick={handlePreviewSigned}
              disabled={!canAccessSignedPdf || previewing || downloading}
              title={signedPdfDisabledTitle}
            >
              {previewing ? 'Opening...' : 'Preview Signed PDF'}
            </Button>
            <Button
              icon={downloading ? Loader2 : Download}
              className={downloading ? 'btn-spinning' : ''}
              onClick={handleDownloadSigned}
              disabled={!canAccessSignedPdf || downloading || previewing}
              title={signedPdfDisabledTitle}
            >
              {downloading ? 'Downloading...' : 'Download Signed PDF'}
            </Button>
          </div>
        )}
      </div>

      <div className="form-row">
        <Card title={`Recipients (${document.recipients.length})`}>
          <DocumentRecipientList
            documentId={document.id}
            documentTitle={document.title}
            documentStatus={document.status}
            workflowType={document.workflowType}
            recipients={document.recipients}
            fields={document.fields}
          />
        </Card>
        <Card title={`${isCompleted ? 'Signed Fields' : 'Fields'} (${document.fields.length})`}>
          <FieldList fields={document.fields} recipients={document.recipients} />
        </Card>
      </div>
    </>
  )
}
