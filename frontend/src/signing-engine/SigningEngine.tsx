import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSigningStore } from '../stores/signingStore'
import { SignatureModal } from './SignatureModal'
import { SigningSidebar } from './SigningSidebar'
import { SigningDocumentViewer } from './SigningDocumentViewer'
import { saveSigningCompletion } from '../utils/pdf'
import {
  areRequiredFieldsComplete,
  buildRadioGroupSelectionUpdates,
  collapseRadioGroupsForValidation,
  getRadioGroupId,
} from '../utils/radioField'
import { fieldAppliesToProfile } from '../utils/profileField'
import { getRecipientRoleColor } from '../constants/fieldTypes'
import { Button } from '../components/ui/Button'
import type { Document, SigningMode } from '../types'
import './signing.css'

interface SigningEngineProps {
  document: Document
  recipientId: string
  investorRecipientId?: string
  mode: SigningMode
  token?: string
  onComplete?: (fieldValues: Record<string, string>) => void | Promise<unknown>
  onDecline?: () => void
  onEvent?: (event: string, data?: Record<string, unknown>) => void
  branding?: {
    primaryColor?: string
    buttonColor?: string
    logoUrl?: string
  }
}

export function SigningEngine({
  document,
  recipientId,
  investorRecipientId,
  mode,
  token,
  onComplete,
  onDecline,
  onEvent,
  branding,
}: SigningEngineProps) {
  const navigate = useNavigate()
  const {
    setMode,
    fieldValues,
    fieldSignedAt,
    setFieldValue,
    setFieldValues,
    setFieldSignedAt,
    currentFieldIndex,
    setCurrentFieldIndex,
    openSignatureModal,
    isSignatureModalOpen,
    activeSignatureFieldId,
    closeSignatureModal,
    getProgress,
    reset,
  } = useSigningStore()

  const recipient = document.recipients.find((item) => item.id === recipientId)
  const investorRecipient = investorRecipientId
    ? document.recipients.find((item) => item.id === investorRecipientId)
    : undefined

  const investorFields =
    recipient?.role === 'seller' && investorRecipient
      ? document.fields.filter((field) => {
          if (field.recipientId !== investorRecipientId) return false
          if (investorRecipient.profileType) {
            return fieldAppliesToProfile(field, investorRecipient.profileType)
          }
          return true
        })
      : []

  const previouslySignedFields = document.fields.filter((field) => {
    if (field.recipientId === recipientId) return false
    const owner = document.recipients.find((item) => item.id === field.recipientId)
    if (!owner || (owner.signingStatus !== 'signed' && owner.signed !== true)) {
      return false
    }
    if (owner.role === 'buyer' && owner.profileType) {
      return fieldAppliesToProfile(field, owner.profileType)
    }
    return true
  })

  const recipientFields = document.fields.filter((field) => {
    if (field.recipientId !== recipientId) {
      return false
    }

    if (recipient?.role === 'buyer' && recipient.profileType) {
      return fieldAppliesToProfile(field, recipient.profileType)
    }

    return true
  })

  const viewerFields = [...previouslySignedFields, ...investorFields, ...recipientFields]
  const readOnlyFieldIds = new Set([
    ...previouslySignedFields.map((field) => field.id),
    ...investorFields.map((field) => field.id),
  ])
  const requiredFields = collapseRadioGroupsForValidation(recipientFields.filter((f) => f.required))
  const progress = getProgress(recipientFields)

  useEffect(() => {
    setMode(mode)
    onEvent?.('loaded', { documentId: document.id })

    const initialValues: Record<string, string> = {}
    const initialSignedAt: Record<string, string> = {}
    const seenRadioGroups = new Set<string>()
    for (const field of document.fields) {
      if (!field.value) continue

      if (field.type === 'radio' && field.value === 'selected') {
        const groupId = getRadioGroupId(field, document.fields)
        if (groupId) {
          if (seenRadioGroups.has(groupId)) continue
          seenRadioGroups.add(groupId)
        }
      }

      initialValues[field.id] = field.value

      const owner = document.recipients.find((item) => item.id === field.recipientId)
      if (owner?.signedAt && (field.type === 'signature' || field.type === 'initial')) {
        initialSignedAt[field.id] = owner.signedAt
      }
    }
    if (Object.keys(initialValues).length > 0) {
      setFieldValues(initialValues)
    }
    if (Object.keys(initialSignedAt).length > 0) {
      for (const [fieldId, signedAt] of Object.entries(initialSignedAt)) {
        setFieldSignedAt(fieldId, signedAt)
      }
    }

    if (mode === 'embedded' || mode === 'iframe') {
      window.parent.postMessage({ event: 'signflow.loaded', documentId: document.id }, '*')
    }
    return () => reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialize once per document session
  }, [document.id, investorRecipientId, mode])

  const applyBranding = useCallback(() => {
    if (branding?.primaryColor) {
      window.document.documentElement.style.setProperty('--color-primary', branding.primaryColor)
      window.document.documentElement.style.setProperty('--color-button', branding.buttonColor || branding.primaryColor)
    }
  }, [branding])

  useEffect(() => {
    applyBranding()
  }, [applyBranding])

  const handleFieldActivate = (fieldId: string) => {
    const index = recipientFields.findIndex((field) => field.id === fieldId)
    if (index >= 0) {
      setCurrentFieldIndex(index)
    }
  }

  const handleFieldValueChange = (fieldId: string, value: string) => {
    const field = document.fields.find((item) => item.id === fieldId)
    if (field?.type === 'radio' && value === 'selected') {
      const updates = buildRadioGroupSelectionUpdates(document.fields, fieldId)
      setFieldValues(updates)
      onEvent?.('signed', { fieldId, groupId: getRadioGroupId(field, document.fields) })
      return
    }

    setFieldValue(fieldId, value)
    onEvent?.('signed', { fieldId })
  }

  const handleSignatureRequest = (fieldId: string) => {
    openSignatureModal(fieldId)
  }

  const handleSignatureSave = (value: string) => {
    if (activeSignatureFieldId) {
      const signedAt = new Date().toISOString()
      const nextFieldValues = { ...fieldValues, [activeSignatureFieldId]: value }

      setFieldValue(activeSignatureFieldId, value)
      setFieldSignedAt(activeSignatureFieldId, signedAt)

      const dateUpdates: Record<string, string> = {}
      for (const field of recipientFields) {
        if (field.type === 'date' && !nextFieldValues[field.id]) {
          dateUpdates[field.id] = signedAt.slice(0, 10)
        }
      }
      if (Object.keys(dateUpdates).length > 0) {
        setFieldValues(dateUpdates)
      }

      onEvent?.('signed', { fieldId: activeSignatureFieldId, signedAt })
    }
    closeSignatureModal()
  }

  const goToNextField = () => {
    const nextIndex = Math.min(currentFieldIndex + 1, requiredFields.length - 1)
    setCurrentFieldIndex(nextIndex)
  }

  const goToPrevField = () => {
    const prevIndex = Math.max(currentFieldIndex - 1, 0)
    setCurrentFieldIndex(prevIndex)
  }

  const handleComplete = async () => {
    if (!areRequiredFieldsComplete(recipientFields, fieldValues)) {
      alert('Please complete all required fields before signing.')
      return
    }
    onEvent?.('completed', { documentId: document.id, fieldValues })
    if (mode === 'embedded' || mode === 'iframe') {
      window.parent.postMessage(
        { event: 'document.completed', documentId: document.id },
        '*',
      )
    }

    saveSigningCompletion({
      documentId: document.id,
      title: document.title,
      fileUrl: document.fileUrl,
      token,
      completedAt: new Date().toISOString(),
    })

    const completedAt = new Date().toISOString()
    const mergedFieldValues = { ...fieldValues }
    for (const field of recipientFields) {
      if (field.type === 'date' && !mergedFieldValues[field.id]) {
        mergedFieldValues[field.id] = completedAt.slice(0, 10)
      }
    }

    const valuesToSubmit = Object.fromEntries(
      Object.entries(mergedFieldValues).filter(([fieldId]) =>
        recipientFields.some((field) => field.id === fieldId),
      ),
    )

    await onComplete?.(valuesToSubmit)

    if (mode === 'public' && token) {
      navigate(`/sign/${token}/complete`)
    }
  }

  const getRecipientColor = (fieldRecipientId: string) => {
    const recipient = document.recipients.find((r) => r.id === fieldRecipientId)
    return recipient?.color || getRecipientRoleColor(recipient?.role ?? 'buyer')
  }

  const canComplete = areRequiredFieldsComplete(recipientFields, fieldValues)

  const containerClass = `signing-engine signing-engine-${mode}`
  const isIframeMode = mode === 'iframe'

  const signingViewer = (
    <SigningDocumentViewer
      documentId={document.id}
      fileUrl={document.fileUrl}
      signingToken={token}
      title={document.title}
      pages={document.pages}
      fields={viewerFields}
      fieldValues={fieldValues}
      fieldSignedAt={fieldSignedAt}
      activeFieldId={recipientFields[currentFieldIndex]?.id}
      readOnlyFieldIds={readOnlyFieldIds}
      getRecipientColor={getRecipientColor}
      onFieldActivate={handleFieldActivate}
      onFieldValueChange={handleFieldValueChange}
      onSignatureRequest={handleSignatureRequest}
      showAllPages={isIframeMode}
    />
  )

  return (
    <div className={containerClass}>
      {branding?.logoUrl && (
        <div className="signing-brand">
          <img src={branding.logoUrl} alt="Organization logo" />
        </div>
      )}

      {isIframeMode ? (
        <div className="signing-embed-layout">
          <header className="signing-embed-chrome">
            <div className="signing-embed-chrome-main">
              <h2 className="signing-embed-title">{document.title}</h2>
              {investorRecipient && recipient?.role === 'seller' && (
                <p className="signing-embed-counter-sign">
                  Counter-signing for <strong>{investorRecipient.name}</strong>
                </p>
              )}
              <div className="signing-embed-progress-row">
                <div className="progress-bar signing-embed-progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="progress-text">{progress}% complete</span>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleComplete}
              disabled={!canComplete}
              className="signing-embed-finish-btn"
            >
              Finish signing
            </Button>
          </header>
          <div className="signing-embed-body">{signingViewer}</div>
        </div>
      ) : (
        <div className="signing-layout">
          <SigningSidebar
            fields={recipientFields}
            fieldValues={fieldValues}
            currentFieldIndex={currentFieldIndex}
            progress={progress}
            onNext={goToNextField}
            onPrevious={goToPrevField}
            onComplete={handleComplete}
            onDecline={onDecline}
          />

          <div className="signing-viewer">
            <div className="signing-doc-header">
              <h2>{document.title}</h2>
              {investorRecipient && recipient?.role === 'seller' && (
                <p className="signing-counter-sign-notice">
                  Counter-signing for investor: <strong>{investorRecipient.name}</strong>
                </p>
              )}
              <span className="signing-progress-badge">{progress}% complete</span>
            </div>

            {signingViewer}
          </div>
        </div>
      )}

      <SignatureModal
        open={isSignatureModalOpen}
        onClose={closeSignatureModal}
        onSave={handleSignatureSave}
      />
    </div>
  )
}
