import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Eye, Loader2 } from 'lucide-react'
import { APP_NAME } from '../common/AppBrand'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { api } from '../../api/client'
import {
  createPdfPreviewObjectUrl,
  downloadSignedDocumentCopy,
  openPreviewTab,
  revokePdfPreviewObjectUrl,
  showBlobInPreviewTab,
} from '../../utils/pdf'
import { formatDisplayDateTime } from '../../utils/date'
import { toast } from '../../utils/toast'

interface CompletionCardProps {
  title?: string
  token?: string
  completedAt?: string
}

export function CompletionCard({
  title,
  token,
  completedAt,
}: CompletionCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [inlinePreview, setInlinePreview] = useState<{ title: string; url: string } | null>(null)

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

  const handlePreview = async () => {
    if (!token) {
      toast.error('Signed document preview is not available.')
      return
    }

    const previewTab = openPreviewTab()
    const useInlinePreview = !previewTab
    const previewTitle = `${title ?? 'Document'} — signed copy`

    setPreviewing(true)

    try {
      const blob = await api.signing.previewSigned(token)

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
      toast.error('Unable to preview the signed document. Please try again.')
    } finally {
      setPreviewing(false)
    }
  }

  const handleDownload = async () => {
    if (!token) {
      toast.error('Signed document is not available for download.')
      return
    }

    setDownloading(true)

    try {
      await downloadSignedDocumentCopy(token, title ?? 'document')
      toast.success('Signed copy downloaded.')
    } catch {
      toast.error('Unable to download the signed document. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Modal
        open={Boolean(inlinePreview)}
        onClose={closeInlinePreview}
        title={inlinePreview?.title ?? 'Signed document preview'}
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

      <div className="completion-card">
        <div className="completion-icon">✅</div>
        <h1>Document Signed</h1>
        <p>Your signature has been recorded successfully.</p>
        <p className="completion-timestamp">
          Signed on {formatDisplayDateTime(completedAt ?? new Date())}
        </p>
        <div className="actions-row" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
          <Button
            type="button"
            variant="secondary"
            icon={previewing ? Loader2 : Eye}
            className={previewing ? 'btn-spinning' : ''}
            onClick={handlePreview}
            disabled={previewing || downloading || !token}
          >
            {previewing ? 'Opening preview...' : 'Preview document'}
          </Button>
          <Button
            icon={downloading ? Loader2 : Download}
            className={downloading ? 'btn-spinning' : ''}
            onClick={handleDownload}
            disabled={downloading || previewing || !token}
          >
            {downloading ? 'Downloading...' : 'Download copy'}
          </Button>
        </div>
        <p className="completion-note">A confirmation email has been sent to your inbox.</p>
        <Link to="/login" className="completion-link">
          Powered by {APP_NAME}
        </Link>
      </div>
    </>
  )
}

export function SigningErrorState() {
  return (
    <div className="signing-error">
      <h2>Invalid or expired signing link</h2>
      <p>Please contact the sender for a new link.</p>
    </div>
  )
}

export function SigningLoadingState() {
  return (
    <div className="signing-loading">
      <p>Loading document...</p>
    </div>
  )
}
