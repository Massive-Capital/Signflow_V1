import { create } from 'zustand'
import type { DocumentField } from '../types'
import { collapseRadioGroupsForValidation, getRadioGroupId, isRadioGroupFilled, isRadioSelected } from '../utils/radioField'

interface SigningState {
  mode: import('../types').SigningMode
  fieldValues: Record<string, string>
  fieldSignedAt: Record<string, string>
  currentFieldIndex: number
  isSignatureModalOpen: boolean
  activeSignatureFieldId: string | null
  setMode: (mode: import('../types').SigningMode) => void
  setFieldValue: (fieldId: string, value: string) => void
  setFieldValues: (values: Record<string, string>) => void
  setFieldSignedAt: (fieldId: string, signedAt: string) => void
  setCurrentFieldIndex: (index: number) => void
  openSignatureModal: (fieldId: string) => void
  closeSignatureModal: () => void
  reset: () => void
  getRequiredFields: (fields: DocumentField[]) => DocumentField[]
  getProgress: (fields: DocumentField[]) => number
}

function isFieldFilled(field: DocumentField, fields: DocumentField[], fieldValues: Record<string, string>): boolean {
  if (field.type === 'radio') {
    const groupId = getRadioGroupId(field, fields)
    return groupId
      ? isRadioGroupFilled(fields, fieldValues, groupId)
      : isRadioSelected(fieldValues, field.id)
  }
  return Boolean(fieldValues[field.id])
}

export const useSigningStore = create<SigningState>((set, get) => ({
  mode: 'public',
  fieldValues: {},
  fieldSignedAt: {},
  currentFieldIndex: 0,
  isSignatureModalOpen: false,
  activeSignatureFieldId: null,

  setMode: (mode) => set({ mode }),
  setFieldValue: (fieldId, value) =>
    set((state) => ({ fieldValues: { ...state.fieldValues, [fieldId]: value } })),
  setFieldValues: (values) =>
    set((state) => ({ fieldValues: { ...state.fieldValues, ...values } })),
  setFieldSignedAt: (fieldId, signedAt) =>
    set((state) => ({
      fieldSignedAt: { ...state.fieldSignedAt, [fieldId]: signedAt },
    })),
  setCurrentFieldIndex: (index) => set({ currentFieldIndex: index }),
  openSignatureModal: (fieldId) =>
    set({ isSignatureModalOpen: true, activeSignatureFieldId: fieldId }),
  closeSignatureModal: () =>
    set({ isSignatureModalOpen: false, activeSignatureFieldId: null }),
  reset: () =>
    set({
      fieldValues: {},
      fieldSignedAt: {},
      currentFieldIndex: 0,
      isSignatureModalOpen: false,
      activeSignatureFieldId: null,
    }),

  getRequiredFields: (fields) => collapseRadioGroupsForValidation(fields.filter((f) => f.required)),
  getProgress: (fields) => {
    const required = collapseRadioGroupsForValidation(fields.filter((f) => f.required))
    if (required.length === 0) return 100
    const filled = required.filter((field) => isFieldFilled(field, fields, get().fieldValues)).length
    return Math.round((filled / required.length) * 100)
  },
}))
