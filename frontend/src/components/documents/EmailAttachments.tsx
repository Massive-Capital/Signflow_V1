import { useRef } from 'react'
import { Loader2, Paperclip, X } from 'lucide-react'
import { Button } from '../ui/Button'
import type { EmailAttachment } from '../../types'

interface EmailAttachmentsProps {
  attachments: EmailAttachment[]
  uploading: boolean
  onAdd: (files: FileList) => void
  onRemove: (attachmentId: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function EmailAttachments({
  attachments,
  uploading,
  onAdd,
  onRemove,
}: EmailAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="email-attachments">
      <div className="email-attachments-header">
        <span className="email-attachments-title">Attachments</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={`btn-bordered-action${uploading ? ' btn-spinning' : ''}`}
          icon={uploading ? Loader2 : Paperclip}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading...' : 'Add files'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="email-attachments-input"
          multiple
          onChange={(event) => {
            if (event.target.files?.length) {
              onAdd(event.target.files)
              event.target.value = ''
            }
          }}
        />
      </div>

      {attachments.length === 0 ? (
        <p className="email-attachments-empty">No attachments added yet.</p>
      ) : (
        <ul className="email-attachments-list">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <Paperclip size={14} strokeWidth={2} aria-hidden />
              <span className="email-attachment-name">{attachment.originalName}</span>
              <span className="email-attachment-size">{formatFileSize(attachment.size)}</span>
              <button
                type="button"
                className="email-attachment-remove"
                aria-label={`Remove ${attachment.originalName}`}
                onClick={() => onRemove(attachment.id)}
                disabled={uploading}
              >
                <X size={14} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
