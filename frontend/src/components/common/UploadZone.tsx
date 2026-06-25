import { useId, useRef, useState } from 'react'
import { FileCheck, FileUp } from 'lucide-react'
import { formatFileSize } from '../../utils/pdf'

interface UploadZoneProps {
  file: File | null
  onFileChange: (file: File | null) => void
  hint?: string
  label?: string
  error?: string
  disabled?: boolean
  accept?: string
}

export function UploadZone({
  file,
  onFileChange,
  hint = 'PDF files up to 25MB',
  label = 'Document file',
  error,
  disabled = false,
  accept = 'application/pdf,.pdf',
}: UploadZoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const openFilePicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  const handleFiles = (files: FileList | null) => {
    const selected = files?.[0] ?? null
    onFileChange(selected)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) return
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div className="input-group">
      <label htmlFor={inputId}>{label}</label>
      <div
        className={[
          'upload-zone',
          isDragging ? 'upload-zone--active' : '',
          file ? 'upload-zone--has-file' : '',
          error ? 'upload-zone--error' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={openFilePicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openFilePicker()
          }
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          hidden
          disabled={disabled}
          onChange={(event) => handleFiles(event.target.files)}
        />
        {file ? (
          <>
            <span className="upload-zone-icon" aria-hidden>
              <FileCheck size={24} strokeWidth={2} />
            </span>
            <p className="upload-file-name">{file.name}</p>
            <span className="upload-hint">{formatFileSize(file.size)}</span>
            <button
              type="button"
              className="upload-remove"
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation()
                onFileChange(null)
                if (inputRef.current) inputRef.current.value = ''
              }}
            >
              Remove file
            </button>
          </>
        ) : (
          <>
            <span className="upload-zone-icon" aria-hidden>
              <FileUp size={24} strokeWidth={2} />
            </span>
            <p>Drag and drop a PDF here, or click to browse</p>
            <span className="upload-hint">{hint}</span>
          </>
        )}
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  )
}
