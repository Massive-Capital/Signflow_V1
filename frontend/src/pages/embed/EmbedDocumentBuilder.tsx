import { lazy, Suspense, useCallback, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { EmbedToolbar } from '../../components/documents/EmbedToolbar'
import { FieldTypePanel } from '../../components/documents/FieldTypePanel'
import { ProfileScopeModal } from '../../components/documents/ProfileScopeModal'
import { useDocument } from '../../hooks/useDocuments'
import { useDocumentBuilder } from '../../hooks/useDocumentBuilder'
import { useUploadDocumentFile } from '../../hooks/useDocumentMutations'
import { getDocumentFileUrl } from '../../utils/pdf'

const PdfCanvas = lazy(() =>
  import('../../components/documents/PdfCanvas').then((module) => ({
    default: module.PdfCanvas,
  })),
)

function EmbedBuilderLoading({ message }: { message: string }) {
  return (
    <div className="embed-builder-loading" role="status" aria-live="polite">
      <Loader2 className="embed-builder-spin" size={26} strokeWidth={2} aria-hidden />
      <p>{message}</p>
    </div>
  )
}

function notifyEmbedParent(event: string, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined' || window.parent === window) return
  window.parent.postMessage({ source: 'signflow-embed', event, ...payload }, '*')
}

/** Slim field-placement UI for portal iframe embed — no SignFlow app chrome. */
export function EmbedDocumentBuilder() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: document, isLoading, isError, error } = useDocument(id)
  const builder = useDocumentBuilder(document, id, { embedMode: true })
  const uploadDocumentFile = useUploadDocumentFile(id)
  const readyNotifiedRef = useRef(false)

  const pdfUrl = document ? getDocumentFileUrl(id, document.fileUrl) : undefined

  const handlePdfReady = useCallback(() => {
    notifyEmbedParent('builder-ready', { documentId: id })
  }, [id])

  useEffect(() => {
    if (!document || readyNotifiedRef.current) return
    readyNotifiedRef.current = true
    notifyEmbedParent('builder-document-loaded', {
      documentId: document.id,
      title: document.title,
      hasFile: Boolean(pdfUrl),
    })
  }, [document, pdfUrl])

  useEffect(() => {
    if (!document) return
    notifyEmbedParent('builder-template-state', {
      documentId: document.id,
      canSaveTemplate: builder?.canSaveTemplate ?? false,
    })
  }, [document, builder?.canSaveTemplate])

  const handleSaveTemplate = useCallback(() => {
    if (!builder?.canSaveTemplate || !document) return
    notifyEmbedParent('builder-save-template', {
      documentId: document.id,
      title: document.title,
    })
  }, [builder?.canSaveTemplate, document])

  if (isLoading && !document) {
    return <EmbedBuilderLoading message="Loading document…" />
  }

  if (isError || !document) {
    const message =
      error instanceof Error
        ? error.message
        : 'Could not load this document. Check the embed API key and try again.'
    notifyEmbedParent('builder-error', { message })
    return (
      <div className="embed-error" role="alert">
        <p>{message}</p>
      </div>
    )
  }

  if (!builder) {
    return <EmbedBuilderLoading message="Preparing builder…" />
  }

  if (!pdfUrl) {
    notifyEmbedParent('builder-error', {
      message:
        'This template has no PDF file yet. Close the editor and upload the document again.',
    })
    return (
      <div className="embed-error" role="alert">
        <p>This template has no PDF file yet. Close the editor and upload the document again.</p>
      </div>
    )
  }

  const profileScopeModal = builder.getProfileScopeModalState()

  return (
    <div className="embed-builder">
      <EmbedToolbar
        activeAssignRole={builder.activeAssignRole}
        fields={builder.document.fields}
        recipients={builder.document.recipients}
        canSaveTemplate={builder.canSaveTemplate}
        isSaving={builder.isSaving}
        onSelectAssignRole={builder.setSelectedRecipientRole}
        onSaveTemplate={handleSaveTemplate}
      />

      <div className="embed-builder-layout">
        <div className="embed-builder-pdf-stage">
          <Suspense fallback={<EmbedBuilderLoading message="Loading PDF…" />}>
            <PdfCanvas
              documentId={id}
              fileUrl={document.fileUrl}
              title={document.title}
              pages={document.pages}
              selectedFieldType={builder.selectedFieldType}
              fields={builder.document.fields}
              getFieldColor={builder.getFieldColor}
              isFieldVisibleInPreview={builder.isFieldVisibleInPreview}
              onPlaceField={builder.placeField}
              onMoveField={builder.moveField}
              onResizeField={builder.resizeField}
              onRemoveField={builder.removeField}
              onAddRadioOption={builder.addRadioOption}
              onReuploadFile={(file) => uploadDocumentFile.mutateAsync(file)}
              isReuploading={uploadDocumentFile.isPending}
              canPlaceFields={builder.canPlaceFields}
              placementBlockedMessage={builder.placementBlockedMessage}
              activeProfileColor={builder.activeProfileColor}
              onPdfReady={handlePdfReady}
            />
          </Suspense>
        </div>

        <FieldTypePanel
          activeProfileType={builder.activeProfileType}
          isProfilePreviewEnabled={builder.isProfilePreviewEnabled}
          selectedFieldType={builder.selectedFieldType}
          newFieldRequired={builder.newFieldRequired}
          fields={builder.document.fields}
          recipients={builder.document.recipients}
          getFieldColor={builder.getFieldColor}
          onSelectProfileType={builder.setSelectedProfileType}
          onSelectFieldType={builder.setSelectedFieldType}
          onNewFieldRequiredChange={builder.setNewFieldRequired}
          onToggleFieldRequired={builder.setFieldRequired}
          onRemoveField={builder.removeField}
          onAddRadioOption={builder.addRadioOption}
          onUpdateFieldLabel={builder.updateFieldLabel}
          onEditFieldProfileScope={builder.openEditFieldProfileScope}
        />
      </div>

      <ProfileScopeModal
        open={profileScopeModal !== null}
        mode={profileScopeModal?.mode ?? 'place'}
        fieldLabel={profileScopeModal?.fieldLabel ?? 'Field'}
        initialScope={profileScopeModal?.initialScope ?? 'all'}
        onClose={builder.cancelProfileScope}
        onConfirm={builder.confirmProfileScope}
      />
    </div>
  )
}
