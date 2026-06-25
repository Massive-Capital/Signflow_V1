import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader'
import { CreateDocumentForm } from '../../components/documents/CreateDocumentForm'
import { useCreateDocument } from '../../hooks/useDocumentMutations'
import { getPdfPageCount, validatePdfFile } from '../../utils/pdf'
import './create-document.css'

export function CreateDocumentPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string>()
  const [validatingFile, setValidatingFile] = useState(false)
  const createDocument = useCreateDocument()

  const handleFileChange = async (selected: File | null) => {
    setFileError(undefined)
    setFile(null)

    if (!selected) return

    const validationError = validatePdfFile(selected)
    if (validationError) {
      setFileError(validationError)
      return
    }

    setValidatingFile(true)
    try {
      await getPdfPageCount(selected)
      setFile(selected)
    } catch {
      setFileError('Could not read this PDF. Please choose another file.')
    } finally {
      setValidatingFile(false)
    }
  }

  const handleCreate = () => {
    if (!title.trim() || !file) return

    createDocument.mutate(
      { title: title.trim(), file },
      {
        onSuccess: (doc) => navigate(`/documents/${doc.id}/builder`),
        onError: (error) => {
          setFileError(error instanceof Error ? error.message : 'Failed to upload document')
        },
      },
    )
  }

  return (
    <div className="create-document-page">
      <PageHeader
        back="/documents"
        title="Create Document"
        description="Upload a PDF to start building your signing workflow"
      />
      <div className="create-document-content">
        <CreateDocumentForm
          title={title}
          file={file}
          loading={createDocument.isPending || validatingFile}
          fileError={fileError}
          onTitleChange={setTitle}
          onFileChange={handleFileChange}
          onSubmit={handleCreate}
        />
      </div>
    </div>
  )
}
