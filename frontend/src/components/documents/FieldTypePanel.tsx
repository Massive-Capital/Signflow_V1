import { Pencil, Trash2 } from 'lucide-react'
import {
  FIELD_TYPES,
  PROFILE_TYPE_OPTIONS,
  colorWithAlpha,
  getProfileTypeStyle,
} from '../../constants/fieldTypes'
import { getRadioGroupFields, getRadioGroupId } from '../../utils/radioField'
import { formatFieldProfileScope } from '../../utils/profileField'
import { IconButton } from '../ui/IconButton'
import type { DocumentField, FieldType, ProfileType, Recipient } from '../../types'

interface FieldTypePanelProps {
  activeProfileType: ProfileType
  isProfilePreviewEnabled: boolean
  selectedFieldType: FieldType
  newFieldRequired: boolean
  fields: DocumentField[]
  recipients: Recipient[]
  getFieldColor: (field: DocumentField) => string
  onSelectProfileType: (profileType: ProfileType) => void
  onSelectFieldType: (type: FieldType) => void
  onNewFieldRequiredChange: (required: boolean) => void
  onToggleFieldRequired: (fieldId: string, required: boolean) => void
  onRemoveField: (fieldId: string) => void
  onAddRadioOption: (fieldId: string) => void
  onUpdateFieldLabel: (fieldId: string, label: string) => void
  onEditFieldProfileScope: (fieldId: string) => void
}

export function FieldTypePanel({
  activeProfileType,
  isProfilePreviewEnabled,
  selectedFieldType,
  newFieldRequired,
  fields,
  recipients,
  getFieldColor,
  onSelectProfileType,
  onSelectFieldType,
  onNewFieldRequiredChange,
  onToggleFieldRequired,
  onRemoveField,
  onAddRadioOption,
  onUpdateFieldLabel,
  onEditFieldProfileScope,
}: FieldTypePanelProps) {
  return (
    <aside className="field-panel">
      <h3>Preview Profile Type</h3>
      <p className="profile-type-preview-hint">
        Preview which fields appear for each investor profile. When placing a field, choose its
        profile scope — click the profile badge on any placed field to change it later.
      </p>
      <div className={`profile-type-list ${isProfilePreviewEnabled ? '' : 'profile-type-list--disabled'}`}>
        {PROFILE_TYPE_OPTIONS.map((option) => {
          const accent = getProfileTypeStyle(option.value)
          const isActive = isProfilePreviewEnabled && activeProfileType === option.value

          return (
            <button
              key={option.value}
              type="button"
              className={`profile-type-chip ${isActive ? 'active' : ''}`}
              style={{
                borderColor: isActive ? accent.border : accent.ring,
                color: isActive ? accent.color : 'var(--color-text)',
                backgroundColor: isActive ? accent.softBg : 'var(--input-bg)',
                boxShadow: isActive ? `inset 0 0 0 1px ${accent.ring}` : undefined,
              }}
              onClick={() => onSelectProfileType(option.value)}
              disabled={!isProfilePreviewEnabled}
              aria-pressed={isActive}
              aria-disabled={!isProfilePreviewEnabled}
            >
              <span className="profile-type-chip-label">
                <span
                  className="chip-dot chip-dot--accent"
                  style={{ background: accent.color, ['--chip-color' as string]: accent.color }}
                />
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
      {!isProfilePreviewEnabled && (
        <p className="profile-type-disabled-hint">
          {recipients.some((recipient) => recipient.role === 'buyer') &&
          !recipients.some((recipient) => recipient.role === 'seller')
            ? 'Add a sponsor recipient to preview investor profile fields in this workflow.'
            : 'Add an investor recipient to preview profile-specific fields.'}
        </p>
      )}

      <h3 className="field-panel-section-title">Field Types</h3>
      <div className="field-type-grid">
        {FIELD_TYPES.map((fieldType) => (
          <button
            key={fieldType.type}
            type="button"
            className={`field-type-btn ${selectedFieldType === fieldType.type ? 'active' : ''}`}
            onClick={() => onSelectFieldType(fieldType.type)}
          >
            <span>{fieldType.icon}</span>
            {fieldType.label}
          </button>
        ))}
      </div>

      <label className="field-required-default">
        <input
          type="checkbox"
          checked={newFieldRequired}
          onChange={(event) => onNewFieldRequiredChange(event.target.checked)}
        />
        Required when placed
      </label>

      {selectedFieldType === 'radio' && (
        <p className="field-type-hint">
          Place the first option, then click + on any option to add another field in the same group. Clients can choose only one.
        </p>
      )}

      <h3 className="field-panel-section-title">Placed Fields</h3>
      <ul className="placed-fields">
        {fields.length === 0 ? (
          <li className="empty-hint">Click the document to place fields</li>
        ) : (
          fields.map((field) => {
            const groupId = getRadioGroupId(field, fields)
            const groupSize =
              field.type === 'radio' && groupId
                ? getRadioGroupFields(fields, groupId).length
                : 0
            const fieldColor = getFieldColor(field)
            const recipient = recipients.find((item) => item.id === field.recipientId)
            const showProfileScope = recipient?.role === 'buyer' && field.type !== 'radio'

            return (
              <li
                key={field.id}
                style={{
                  borderLeftColor: fieldColor,
                  backgroundColor: colorWithAlpha(fieldColor, 0.08),
                }}
              >
                <div className="placed-field-main">
                  <div className="placed-field-info">
                    <span className="field-type-tag">{field.type}</span>
                    {field.type === 'radio' ? (
                      <input
                        type="text"
                        className="radio-option-input"
                        value={field.label}
                        onChange={(event) => onUpdateFieldLabel(field.id, event.target.value)}
                        aria-label={`Radio option label for ${field.id}`}
                      />
                    ) : (
                      field.label
                    )}
                    {field.required && <span className="field-required-badge">Required</span>}
                    {showProfileScope && (
                      <button
                        type="button"
                        className="field-profile-type-badge field-profile-type-badge--editable"
                        onClick={() => onEditFieldProfileScope(field.id)}
                        title="Change profile types for this field"
                      >
                        <Pencil size={11} strokeWidth={2.25} aria-hidden />
                        {formatFieldProfileScope(field)}
                      </button>
                    )}
                    {groupSize > 1 && (
                      <span className="radio-group-badge">{groupSize} options</span>
                    )}
                  </div>
                  <div className="placed-field-actions">
                    {field.type === 'radio' && (
                      <button
                        type="button"
                        className="radio-option-add"
                        aria-label="Add radio option field"
                        title="Add option"
                        onClick={() => onAddRadioOption(field.id)}
                      >
                        +
                      </button>
                    )}
                    <label className="placed-field-required">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(event) => onToggleFieldRequired(field.id, event.target.checked)}
                      />
                      Required
                    </label>
                  </div>
                </div>

                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  label={`Remove ${field.label} field`}
                  className="placed-field-remove"
                  onClick={() => onRemoveField(field.id)}
                />
              </li>
            )
          })
        )}
      </ul>
    </aside>
  )
}
