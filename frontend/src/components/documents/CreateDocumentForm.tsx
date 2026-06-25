import { ArrowRight, FileText, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { CancelButton } from '../ui/CancelButton'
import { Input } from '../ui/Input'
import { UploadZone } from '../common/UploadZone'

interface CreateDocumentFormProps {
  title: string
  file: File | null
  loading: boolean
  fileError?: string
  onTitleChange: (value: string) => void
  onFileChange: (file: File | null) => void
  onSubmit: () => void
}

export function CreateDocumentForm({
  title,
  file,
  loading,
  fileError,
  onTitleChange,
  onFileChange,
  onSubmit,
}: CreateDocumentFormProps) {
  const navigate = useNavigate()
  const canSubmit = title.trim().length > 0 && file !== null && !loading

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (canSubmit) onSubmit()
  }

  return (
    <div className="create-document-card card">
      <div className="create-document-card-header">
        <div className="create-document-card-icon" aria-hidden>
          <FileText size={22} strokeWidth={2} />
        </div>
        <div>
          <h2>Document details</h2>
          <p>Name your document and upload the PDF you want recipients to sign.</p>
        </div>
      </div>

      <form className="create-document-card-body" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Input
            label="Document title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. NDA Agreement"
            autoFocus
          />
          <UploadZone
            file={file}
            onFileChange={onFileChange}
            error={fileError}
            disabled={loading}
          />
        </div>

        <div className="create-document-card-footer">
          <CancelButton type="button" onClick={() => navigate('/documents')} disabled={loading} />
          <div className="create-document-card-footer-actions">
            <Button
              type="submit"
              size="lg"
              disabled={!canSubmit}
              icon={loading ? Loader2 : undefined}
              iconRight={!loading ? ArrowRight : undefined}
              className={loading ? 'btn-spinning' : ''}
            >
              {loading ? 'Uploading...' : 'Continue to Builder'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
