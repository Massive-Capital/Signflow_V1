import { formatFieldDisplayValue, getSignatureImageSrc } from '../../utils/pdf'
import {
  collapseRadioGroupsForValidation,
  getRadioGroupFields,
  getRadioGroupId,
} from '../../utils/radioField'
import { formatFieldProfileScope } from '../../utils/profileField'
import { FIELD_TYPES } from '../../constants/fieldTypes'
import type { DocumentField, FieldType, Recipient } from '../../types'

interface FieldListProps {
  fields: DocumentField[]
  recipients?: Recipient[]
  emptyMessage?: string
  showValues?: boolean
}

function getFieldTypeInfo(type: FieldType) {
  return FIELD_TYPES.find((fieldType) => fieldType.type === type) ?? {
    type,
    label: type,
    icon: '•',
  }
}

function getRadioDisplayValue(field: DocumentField, fields: DocumentField[]): string | null {
  const groupId = getRadioGroupId(field, fields)
  if (!groupId) return field.value === 'selected' ? field.label : null

  const selected = getRadioGroupFields(fields, groupId).find((option) => option.value === 'selected')
  return selected?.label ?? null
}

export function FieldList({
  fields,
  recipients = [],
  emptyMessage = 'No fields placed yet',
  showValues = false,
}: FieldListProps) {
  const displayFields = collapseRadioGroupsForValidation(fields)

  if (displayFields.length === 0) {
    return <p className="field-list-empty-state">{emptyMessage}</p>
  }

  return (
    <ul className="field-list">
      {displayFields.map((field) => {
        const signatureSrc = showValues && field.value ? getSignatureImageSrc(field.value) : null
        const radioValue = showValues && field.type === 'radio' ? getRadioDisplayValue(field, fields) : null
        const recipient = recipients.find((item) => item.id === field.recipientId)
        const fieldType = getFieldTypeInfo(field.type)
        const groupId = getRadioGroupId(field, fields)
        const radioOptionCount =
          field.type === 'radio' && groupId ? getRadioGroupFields(fields, groupId).length : 0
        const showProfileScope = recipient?.role === 'buyer' && field.type !== 'radio'
        const displayLabel = field.type === 'radio' ? 'Radio choice' : field.label

        return (
          <li
            key={field.id}
            className={showValues ? 'field-list-item-signed' : undefined}
            style={{ borderLeftColor: recipient?.color ?? 'var(--color-border)' }}
          >
            <div className="field-list-main">
              <div className="field-list-title-row">
                <strong className="field-list-label">{displayLabel}</strong>
                {field.required && <span className="field-list-required-badge">Required</span>}
              </div>

              <div className="field-list-meta">
                <span className="field-list-type-chip" title={fieldType.label}>
                  <span className="field-list-type-icon" aria-hidden>
                    {fieldType.icon}
                  </span>
                  {fieldType.label}
                </span>
                <span className="field-list-meta-text">Page {field.page}</span>
                {recipient && <span className="field-list-meta-text">{recipient.name}</span>}
                {radioOptionCount > 1 && (
                  <span className="field-list-radio-count">
                    {radioOptionCount} options
                  </span>
                )}
                {showProfileScope && (
                  <span className="field-list-profile-badge">{formatFieldProfileScope(field)}</span>
                )}
              </div>

              {showValues && (
                <div className="field-list-value">
                  {signatureSrc ? (
                    <img
                      src={signatureSrc}
                      alt={`${field.label} signature`}
                      className="field-signature-preview"
                    />
                  ) : radioValue ? (
                    radioValue
                  ) : field.value ? (
                    formatFieldDisplayValue(field.value)
                  ) : (
                    <span className="field-list-value-empty">Not filled</span>
                  )}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
