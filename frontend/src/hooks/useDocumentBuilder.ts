import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DocumentField, FieldType, ProfileType, Recipient } from '../types'
import { FIELD_TYPES, getAssignToLabel, getDefaultFieldSize, getProfileTypeColor, getProfileTypeStyle, getRecipientRoleColor, getRecipientRoleStyle, type ProfileScopeSelection } from '../constants/fieldTypes'
import {
  findNearbyRadioGroupId,
  getNextRadioOptionLabel,
  getRadioGroupFields,
  getRadioGroupId,
} from '../utils/radioField'
import { fieldAppliesToProfile, getFieldProfileScope, getFieldProfileTypes } from '../utils/profileField'
import { isInvestorSponsorWorkflow } from '../utils/investorSponsorWorkflow'
import { canSaveEmbedTemplate } from '../utils/embedTemplate'
import { EMBED_DEFAULT_RECIPIENTS } from '../constants/embedDefaults'
import { useUpdateDocument } from './useDocumentMutations'
import type { Document } from '../types'
import type { RecipientFormValues } from '../components/documents/RecipientFormModal'

export interface UseDocumentBuilderOptions {
  embedMode?: boolean
}

type RecipientModalState =
  | { mode: 'add' }
  | { mode: 'edit'; recipientId: string }
  | null

interface PendingFieldPlacement {
  x: number
  y: number
  page: number
  fieldLabel: string
}

function buildRecipient(
  values: RecipientFormValues,
  index: number,
  existing?: Recipient,
): Recipient {
  return {
    id: existing?.id ?? `rec_${Date.now()}`,
    name: values.name,
    email: values.email,
    role: values.role,
    color:
      existing && existing.role === values.role
        ? existing.color
        : getRecipientRoleColor(values.role, index),
    order: existing?.order ?? index + 1,
    ...(values.role === 'buyer'
      ? { profileType: values.profileType ?? existing?.profileType ?? 'individual' }
      : {}),
  }
}

export function useDocumentBuilder(
  document: Document | undefined,
  documentId: string,
  options?: UseDocumentBuilderOptions,
) {
  const embedMode = options?.embedMode ?? false
  const navigate = useNavigate()
  const updateDocument = useUpdateDocument(documentId)
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType>('signature')
  const [newFieldRequired, setNewFieldRequired] = useState(true)
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState('')
  const [selectedAssignRole, setSelectedAssignRole] = useState<'buyer' | 'seller'>('buyer')
  const [selectedProfileType, setSelectedProfileType] = useState<ProfileType>('individual')
  const [previewProfileType, setPreviewProfileType] = useState<ProfileType>('individual')
  const [defaultProfileScope, setDefaultProfileScope] = useState<ProfileScopeSelection>('all')
  const [previewProfileMode, setPreviewProfileMode] = useState(false)
  const [pendingFieldPlacement, setPendingFieldPlacement] = useState<PendingFieldPlacement | null>(null)
  const [editingFieldProfileId, setEditingFieldProfileId] = useState<string | null>(null)
  const [recipientModal, setRecipientModal] = useState<RecipientModalState>(null)
  const hasPromptedFirstRecipient = useRef(false)
  const isSeedingEmbedRecipients = useRef(false)
  const previewProfileTouched = useRef(false)

  useEffect(() => {
    if (embedMode) return
    if (!document || document.recipients.length > 0 || hasPromptedFirstRecipient.current) return

    hasPromptedFirstRecipient.current = true
    setRecipientModal({ mode: 'add' })
  }, [document, embedMode])

  useEffect(() => {
    if (!embedMode || !document || isSeedingEmbedRecipients.current) return

    const hasBuyer = document.recipients.some((r) => r.role === 'buyer')
    const hasSeller = document.recipients.some((r) => r.role === 'seller')
    if (hasBuyer && hasSeller) return

    isSeedingEmbedRecipients.current = true
    const recipients = [...document.recipients]
    if (!hasBuyer) recipients.push(EMBED_DEFAULT_RECIPIENTS[0])
    if (!hasSeller) recipients.push(EMBED_DEFAULT_RECIPIENTS[1])
    updateDocument.mutate({ recipients })
  }, [document, embedMode, updateDocument])

  useEffect(() => {
    if (!document?.recipients.length) return

    const buyer = document.recipients.find((recipient) => recipient.role === 'buyer')
    if (buyer?.profileType && !previewProfileTouched.current) {
      setSelectedProfileType(buyer.profileType)
      setPreviewProfileType(buyer.profileType)
    }

    const seller = document.recipients.find((recipient) => recipient.role === 'seller')
    const roleRecipient = document.recipients.find((recipient) => recipient.role === selectedAssignRole)

    if (!roleRecipient) {
      const fallbackRole = buyer ? 'buyer' : seller ? 'seller' : selectedAssignRole
      setSelectedAssignRole(fallbackRole)
      const fallbackRecipient =
        fallbackRole === 'seller' ? seller : buyer ?? seller
      if (fallbackRecipient) setSelectedRecipientEmail(fallbackRecipient.email)
      return
    }

    const selectedStillExists = document.recipients.some(
      (recipient) => recipient.email === selectedRecipientEmail,
    )
    if (!selectedRecipientEmail || !selectedStillExists) {
      setSelectedRecipientEmail(roleRecipient.email)
    }
  }, [document?.recipients, selectedAssignRole, selectedRecipientEmail])

  if (!document) {
    return null
  }

  const recipients = document.recipients
  const activeProfileRecipient = recipients.find((recipient) => recipient.role === selectedAssignRole)
  const activeRecipientId = activeProfileRecipient?.id ?? ''
  const canPlaceFields = Boolean(activeProfileRecipient)
  const placementBlockedMessage = canPlaceFields
    ? undefined
    : `Add an ${getAssignToLabel(selectedAssignRole)} recipient to place fields on the document.`

  const getRecipientColor = (recipientId: string) => {
    const recipient = recipients.find((r) => r.id === recipientId)
    if (!recipient) return '#64748b'
    return getRecipientRoleColor(recipient.role)
  }

  const isProfileTypeEnabled = selectedAssignRole === 'buyer'
  const usesInvestorSponsorWorkflow = isInvestorSponsorWorkflow(recipients)
  const canSaveTemplate = embedMode
    ? canSaveEmbedTemplate(document.fields, recipients)
    : false
  const canUseProfilePreview = embedMode
    ? usesInvestorSponsorWorkflow
    : recipients.some((recipient) => recipient.role === 'buyer')
  const isProfilePreviewEnabled = previewProfileMode && canUseProfilePreview
  const activeProfileColor = isProfilePreviewEnabled
    ? getProfileTypeColor(previewProfileType)
    : getRecipientRoleColor(selectedAssignRole)

  const getFieldColor = (field: DocumentField) => {
    const types = getFieldProfileTypes(field)
    if (types?.length === 1) {
      return getProfileTypeStyle(types[0]).color
    }
    if (!types?.length) {
      return '#64748b'
    }
    const recipient = recipients.find((r) => r.id === field.recipientId)
    return recipient ? getRecipientRoleStyle(recipient.role).color : '#64748b'
  }

  const isFieldVisibleInPreview = (field: DocumentField) => {
    if (!isProfilePreviewEnabled) {
      return true
    }

    const recipient = recipients.find((item) => item.id === field.recipientId)
    // Sponsor fields are always visible in the builder preview.
    if (recipient?.role !== 'buyer') {
      return true
    }

    return fieldAppliesToProfile(field, previewProfileType)
  }

  const handlePreviewProfileTypeChange = (profileType: ProfileType) => {
    previewProfileTouched.current = true
    setPreviewProfileType(profileType)
  }

  const normalizeFieldRecipientIds = (nextRecipients: Recipient[], nextFields: DocumentField[]) => {
    const soleRecipientId = nextRecipients.length === 1 ? nextRecipients[0].id : undefined

    return nextFields.map((field) => {
      if (nextRecipients.some((recipient) => recipient.id === field.recipientId)) {
        return field
      }

      const resolvedRecipientId =
        nextRecipients.find((recipient) => recipient.email === selectedRecipientEmail)?.id ??
        soleRecipientId

      if (resolvedRecipientId && field.recipientId.startsWith('rec_')) {
        return { ...field, recipientId: resolvedRecipientId }
      }

      return field
    })
  }

  const saveBuilderState = (nextRecipients: Recipient[], nextFields: DocumentField[]) => {
    updateDocument.mutate({
      recipients: nextRecipients,
      fields: normalizeFieldRecipientIds(nextRecipients, nextFields),
    })
  }

  const openAddRecipientModal = () => {
    setRecipientModal({ mode: 'add' })
  }

  const openEditRecipientModal = (recipientId: string) => {
    setRecipientModal({ mode: 'edit', recipientId })
  }

  const closeRecipientModal = () => {
    setRecipientModal(null)
  }

  const saveRecipient = (values: RecipientFormValues) => {
    if (recipientModal?.mode === 'edit') {
      const existing = recipients.find((recipient) => recipient.id === recipientModal.recipientId)
      if (!existing) return

      const nextRecipients = recipients.map((recipient, index) =>
        recipient.id === existing.id ? buildRecipient(values, index, existing) : recipient,
      )
      const updatedRecipient = nextRecipients.find((recipient) => recipient.id === existing.id)
      if (updatedRecipient?.profileType) {
        setSelectedProfileType(updatedRecipient.profileType)
      }
      saveBuilderState(nextRecipients, document.fields)
      closeRecipientModal()
      return
    }

    const newRecipient = buildRecipient(values, recipients.length)
    saveBuilderState([...recipients, newRecipient], document.fields)
    if (newRecipient.role === 'buyer' || newRecipient.role === 'seller') {
      setSelectedAssignRole(newRecipient.role)
    }
    if (newRecipient.profileType) {
      setSelectedProfileType(newRecipient.profileType)
    }
    setSelectedRecipientEmail(newRecipient.email)
    closeRecipientModal()
  }

  const getRecipientFormInitialValues = (): RecipientFormValues | undefined => {
    if (recipientModal?.mode === 'edit') {
      const recipient = recipients.find((item) => item.id === recipientModal.recipientId)
      if (!recipient) return undefined

      return {
        name: recipient.name,
        email: recipient.email,
        role: recipient.role,
        ...(recipient.role === 'buyer'
          ? { profileType: recipient.profileType ?? 'individual' }
          : {}),
      }
    }

    if (recipientModal?.mode === 'add') {
      return {
        name: '',
        email: '',
        role: selectedAssignRole,
        ...(selectedAssignRole === 'buyer' ? { profileType: selectedProfileType } : {}),
      }
    }

    return undefined
  }

  const createFieldAt = (
    placement: PendingFieldPlacement,
    profileScope: ProfileScopeSelection,
  ) => {
    if (!activeProfileRecipient) return

    const recipientId = activeProfileRecipient.id
    const { width, height } = getDefaultFieldSize(selectedFieldType)
    const fieldId = `f_${Date.now()}`
    const placementCenterX = placement.x + width / 2
    const placementCenterY = placement.y + height / 2
    const existingRadioGroupId =
      selectedFieldType === 'radio'
        ? findNearbyRadioGroupId(
            document.fields,
            recipientId,
            placement.page,
            placementCenterX,
            placementCenterY,
          )
        : undefined
    const radioGroupId =
      selectedFieldType === 'radio' ? existingRadioGroupId ?? `rg_${Date.now()}` : undefined
    const profileTypes =
      selectedAssignRole === 'buyer' && profileScope !== 'all' ? profileScope : undefined

    const newField: DocumentField = {
      id: fieldId,
      type: selectedFieldType,
      label:
        selectedFieldType === 'radio'
          ? existingRadioGroupId
            ? getNextRadioOptionLabel(document.fields, existingRadioGroupId)
            : 'Option 1'
          : FIELD_TYPES.find((f) => f.type === selectedFieldType)?.label || selectedFieldType,
      x: placement.x,
      y: placement.y,
      width,
      height,
      page: placement.page,
      recipientId,
      required: newFieldRequired,
      ...(profileTypes ? { profileTypes } : {}),
      ...(radioGroupId ? { radioGroupId } : {}),
    }

    saveBuilderState(recipients, [...document.fields, newField])
  }

  const placeField = (event: MouseEvent<HTMLDivElement>, page: number) => {
    if (recipients.length === 0 || !activeProfileRecipient) {
      openAddRecipientModal()
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = ((event.clientX - rect.left) / rect.width) * 100
    const clickY = ((event.clientY - rect.top) / rect.height) * 100
    const { width, height } = getDefaultFieldSize(selectedFieldType)
    const fieldLabel =
      selectedFieldType === 'radio'
        ? 'Radio option'
        : FIELD_TYPES.find((f) => f.type === selectedFieldType)?.label || selectedFieldType

    const placement: PendingFieldPlacement = {
      x: Math.max(0, Math.min(clickX - width / 2, 100 - width)),
      y: Math.max(0, Math.min(clickY - height / 2, 100 - height)),
      page,
      fieldLabel,
    }

    if (selectedAssignRole === 'buyer') {
      setPendingFieldPlacement(placement)
      return
    }

    createFieldAt(placement, 'all')
  }

  const applyProfileScopeToField = (
    field: DocumentField,
    scope: ProfileScopeSelection,
  ): DocumentField => {
    const { profileType: _legacy, profileTypes: _existing, ...rest } = field
    if (scope === 'all') {
      return rest as DocumentField
    }
    return { ...rest, profileTypes: scope }
  }

  const updateFieldsProfileScope = (fieldId: string, scope: ProfileScopeSelection) => {
    const field = document.fields.find((item) => item.id === fieldId)
    if (!field) return

    const groupId = getRadioGroupId(field, document.fields)

    const nextFields = document.fields.map((item) => {
      const isTarget = item.id === fieldId
      const isSameRadioGroup =
        groupId && item.type === 'radio' && getRadioGroupId(item, document.fields) === groupId

      if (!isTarget && !isSameRadioGroup) {
        return item
      }

      return applyProfileScopeToField(item, scope)
    })

    saveBuilderState(recipients, nextFields)
  }

  const confirmProfileScope = (scope: ProfileScopeSelection) => {
    if (editingFieldProfileId) {
      updateFieldsProfileScope(editingFieldProfileId, scope)
      setEditingFieldProfileId(null)
      return
    }

    if (!pendingFieldPlacement) return

    setDefaultProfileScope(scope)
    createFieldAt(pendingFieldPlacement, scope)
    setPendingFieldPlacement(null)
  }

  const cancelProfileScope = () => {
    setPendingFieldPlacement(null)
    setEditingFieldProfileId(null)
  }

  const openEditFieldProfileScope = (fieldId: string) => {
    setEditingFieldProfileId(fieldId)
  }

  const getProfileScopeModalState = () => {
    if (pendingFieldPlacement) {
      return {
        mode: 'place' as const,
        fieldLabel: pendingFieldPlacement.fieldLabel,
        initialScope: defaultProfileScope,
      }
    }

    if (editingFieldProfileId) {
      const field = document.fields.find((item) => item.id === editingFieldProfileId)
      if (!field) {
        return null
      }
      return {
        mode: 'edit' as const,
        fieldLabel: field.label,
        initialScope: getFieldProfileScope(field),
      }
    }

    return null
  }

  const moveField = (fieldId: string, x: number, y: number) => {
    const nextFields = document.fields.map((field) =>
      field.id === fieldId
        ? {
            ...field,
            x: Math.max(0, Math.min(x, 100 - field.width)),
            y: Math.max(0, Math.min(y, 100 - field.height)),
          }
        : field,
    )
    saveBuilderState(recipients, nextFields)
  }

  const resizeField = (fieldId: string, width: number, height: number) => {
    const nextFields = document.fields.map((field) =>
      field.id === fieldId
        ? {
            ...field,
            width: Math.max(3, Math.min(width, 100 - field.x)),
            height: Math.max(2, Math.min(height, 100 - field.y)),
          }
        : field,
    )
    saveBuilderState(recipients, nextFields)
  }

  const setFieldRequired = (fieldId: string, required: boolean) => {
    const field = document.fields.find((item) => item.id === fieldId)
    const groupId = field ? getRadioGroupId(field, document.fields) : undefined

    const nextFields = document.fields.map((item) => {
      if (groupId && item.type === 'radio' && getRadioGroupId(item, document.fields) === groupId) {
        return { ...item, required }
      }
      if (item.id === fieldId) return { ...item, required }
      return item
    })
    saveBuilderState(recipients, nextFields)
  }

  const updateFieldLabel = (fieldId: string, label: string) => {
    const nextFields = document.fields.map((field) =>
      field.id === fieldId ? { ...field, label } : field,
    )
    saveBuilderState(recipients, nextFields)
  }

  const removeField = (fieldId: string) => {
    saveBuilderState(
      recipients,
      document.fields.filter((field) => field.id !== fieldId),
    )
  }

  const addRadioOption = (fieldId: string) => {
    const source = document.fields.find((field) => field.id === fieldId)
    if (!source || source.type !== 'radio') return

    const groupId = getRadioGroupId(source, document.fields)
    if (!groupId) return

    const siblings = getRadioGroupFields(document.fields, groupId)
    const { width, height } = getDefaultFieldSize('radio')
    const bottom = siblings.reduce((max, field) => Math.max(max, field.y + field.height), source.y)
    const gap = 0.5
    const newY = Math.min(bottom + gap, 100 - height)

    const newField: DocumentField = {
      id: `f_${Date.now()}`,
      type: 'radio',
      label: getNextRadioOptionLabel(document.fields, groupId),
      x: source.x,
      y: newY,
      width,
      height,
      page: source.page,
      recipientId: source.recipientId,
      required: source.required,
      profileTypes: source.profileTypes,
      profileType: source.profileType,
      radioGroupId: groupId,
    }

    saveBuilderState(recipients, [...document.fields, newField])
  }

  const removeRecipient = (recipientId: string) => {
    if (recipients.length <= 1) return

    const nextRecipients = recipients.filter((r) => r.id !== recipientId)
    const nextFields = document.fields.filter((field) => field.recipientId !== recipientId)

    if (activeRecipientId === recipientId) {
      const nextRoleRecipient = nextRecipients.find(
        (recipient) => recipient.role === selectedAssignRole,
      )
      setSelectedRecipientEmail(nextRoleRecipient?.email ?? nextRecipients[0]?.email ?? '')
    }

    saveBuilderState(nextRecipients, nextFields)
  }

  const setSelectedRecipientId = (recipientId: string) => {
    const recipient = recipients.find((item) => item.id === recipientId)
    if (recipient) setSelectedRecipientEmail(recipient.email)
  }

  const setSelectedRecipientRole = (role: 'buyer' | 'seller') => {
    setSelectedAssignRole(role)
    const recipient = recipients.find((item) => item.role === role)
    if (recipient) setSelectedRecipientEmail(recipient.email)
  }

  return {
    document,
    selectedFieldType,
    setSelectedFieldType,
    newFieldRequired,
    setNewFieldRequired,
    setFieldRequired,
    activeRecipientId,
    activeAssignRole: selectedAssignRole,
    isProfileTypeEnabled,
    canUseProfilePreview,
    previewProfileMode,
    setPreviewProfileMode,
    isProfilePreviewEnabled,
    activeProfileType: previewProfileType,
    activeProfileColor,
    setSelectedProfileType: handlePreviewProfileTypeChange,
    pendingFieldPlacement,
    editingFieldProfileId,
    defaultProfileScope,
    getProfileScopeModalState,
    confirmProfileScope,
    cancelProfileScope,
    openEditFieldProfileScope,
    isFieldVisibleInPreview,
    canPlaceFields,
    placementBlockedMessage,
    canSaveTemplate,
    setSelectedRecipientId,
    setSelectedRecipientRole,
    recipientModal,
    openAddRecipientModal,
    openEditRecipientModal,
    closeRecipientModal,
    saveRecipient,
    getRecipientFormInitialValues,
    removeRecipient,
    placeField,
    moveField,
    resizeField,
    removeField,
    addRadioOption,
    updateFieldLabel,
    getRecipientColor,
    getFieldColor,
    navigate,
    isSaving: updateDocument.isPending,
  }
}
