import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { PageTitle } from '../../components/common/PageTitle'
import { LoadingState } from '../../components/common/LoadingState'
import { BuilderHeader } from '../../components/documents/BuilderHeader'
import { BuilderToolbar } from '../../components/documents/BuilderToolbar'
import { FieldTypePanel } from '../../components/documents/FieldTypePanel'
import { RecipientFormModal } from '../../components/documents/RecipientFormModal'
import { ProfileScopeModal } from '../../components/documents/ProfileScopeModal'
import { ConfirmModal } from '../../components/ui/Modal'
import { useConfirmAction } from '../../hooks/useConfirmAction'
import { useDocument } from '../../hooks/useDocuments'
import { useDocumentBuilder } from '../../hooks/useDocumentBuilder'
import { useUploadDocumentFile } from '../../hooks/useDocumentMutations'
import { BUILDER_RECIPIENT_ROLE_OPTIONS } from '../../constants/fieldTypes'
import './builder.css'

const PdfCanvas = lazy(() =>
  import('../../components/documents/PdfCanvas').then((module) => ({
    default: module.PdfCanvas,
  })),
)

type RecipientRemoval = { id: string; name: string }

export function DocumentBuilderPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: document, isLoading } = useDocument(id)
  const builder = useDocumentBuilder(document, id)
  const uploadDocumentFile = useUploadDocumentFile(id)
  const recipientRemovalConfirm = useConfirmAction<RecipientRemoval>()

  if (isLoading || !builder) {
    return (
      <>
        <PageTitle title="Document Builder" />
        <LoadingState message="Loading document builder..." />
      </>
    )
  }

  const requestRemoveRecipient = (recipientId: string) => {
    const recipient = builder.document.recipients.find((item) => item.id === recipientId)
    recipientRemovalConfirm.request({
      id: recipientId,
      name: recipient?.name ?? 'this recipient',
    })
  }

  const handleRemoveRecipientConfirm = () => {
    if (!recipientRemovalConfirm.target) return

    builder.removeRecipient(recipientRemovalConfirm.target.id)
    recipientRemovalConfirm.cancel()
  }

  const recipientToRemove = recipientRemovalConfirm.target
  const profileScopeModal = builder.getProfileScopeModalState()

  return (
    <div className="builder-page">
      <PageTitle title={builder.document.title} />
      <BuilderHeader title={builder.document.title} documentId={id} document={builder.document} />
      <BuilderToolbar
        recipients={builder.document.recipients}
        activeAssignRole={builder.activeAssignRole}
        canPlaceFields={builder.canPlaceFields}
        onSelectAssignRole={builder.setSelectedRecipientRole}
        onAddRecipient={builder.openAddRecipientModal}
        onEditRecipient={builder.openEditRecipientModal}
        onRemoveRecipient={requestRemoveRecipient}
      />
      <RecipientFormModal
        open={builder.recipientModal !== null}
        mode={builder.recipientModal?.mode ?? 'add'}
        initialValues={builder.getRecipientFormInitialValues()}
        roleOptions={BUILDER_RECIPIENT_ROLE_OPTIONS}
        isSaving={builder.isSaving}
        onClose={builder.closeRecipientModal}
        onSubmit={builder.saveRecipient}
      />
      <ProfileScopeModal
        open={profileScopeModal !== null}
        mode={profileScopeModal?.mode ?? 'place'}
        fieldLabel={profileScopeModal?.fieldLabel ?? 'Field'}
        initialScope={profileScopeModal?.initialScope ?? 'all'}
        onClose={builder.cancelProfileScope}
        onConfirm={builder.confirmProfileScope}
      />
      <div className="builder-layout">
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
        <Suspense fallback={<LoadingState message="Loading document preview..." />}>
          <PdfCanvas
            documentId={id}
            fileUrl={builder.document.fileUrl}
            title={builder.document.title}
            pages={builder.document.pages}
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
          />
        </Suspense>
      </div>

      <ConfirmModal
        open={recipientRemovalConfirm.isOpen}
        onClose={recipientRemovalConfirm.cancel}
        onConfirm={handleRemoveRecipientConfirm}
        title="Remove recipient"
        message={
          recipientToRemove
            ? `Remove "${recipientToRemove.name}" from this document? Fields assigned to this recipient will also be removed.`
            : ''
        }
        confirmLabel="Remove"
        danger
      />
    </div>
  )
}

export default DocumentBuilderPage
