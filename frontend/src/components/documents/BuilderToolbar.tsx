import { UserPlus } from 'lucide-react'
import { Button } from '../ui/Button'
import { Select } from '../ui/Input'
import {
  BUILDER_ASSIGN_TO_OPTIONS,
  formatRecipientRole,
  getAssignToLabel,
  getRecipientRoleStyle,
} from '../../constants/fieldTypes'
import type { Recipient } from '../../types'

interface BuilderToolbarProps {
  recipients: Recipient[]
  activeAssignRole: 'buyer' | 'seller'
  canPlaceFields: boolean
  onSelectAssignRole: (role: 'buyer' | 'seller') => void
  onAddRecipient: () => void
  onEditRecipient: (id: string) => void
  onRemoveRecipient: (id: string) => void
}

export function BuilderToolbar({
  recipients,
  activeAssignRole,
  canPlaceFields,
  onSelectAssignRole,
  onAddRecipient,
  onEditRecipient,
  onRemoveRecipient,
}: BuilderToolbarProps) {
  const canRemoveRecipients = recipients.length > 1

  const assignToOptions = BUILDER_ASSIGN_TO_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    disabled: !recipients.some((recipient) => recipient.role === option.value),
  }))

  const handleAssignRoleChange = (value: string) => {
    if (value === 'buyer' || value === 'seller') {
      onSelectAssignRole(value)
    }
  }

  return (
    <div className="builder-toolbar">
      <div className="builder-toolbar-left">
        <span className="toolbar-label">Recipients:</span>
        {recipients.length === 0 ? (
          <span className="toolbar-empty-hint">Add a recipient to assign fields</span>
        ) : (
          recipients.map((recipient, index) => {
            const accent = getRecipientRoleStyle(recipient.role, index)

            return (
            <div
              key={recipient.id}
              className="recipient-chip"
              style={{
                borderColor: accent.border,
                backgroundColor: accent.softBg,
                color: accent.color,
                boxShadow: `inset 0 0 0 1px ${accent.ring}`,
              }}
            >
              <span className="recipient-chip-label">
                <span
                  className="chip-dot chip-dot--accent"
                  style={{ background: accent.color, ['--chip-color' as string]: accent.color }}
                />
                {recipient.name} ({formatRecipientRole(recipient.role)})
              </span>
              <button
                type="button"
                className="recipient-chip-edit"
                aria-label={`Edit ${recipient.name}`}
                onClick={() => onEditRecipient(recipient.id)}
              >
                ✎
              </button>
              {canRemoveRecipients && (
                <button
                  type="button"
                  className="recipient-chip-remove"
                  aria-label={`Remove ${recipient.name}`}
                  onClick={() => onRemoveRecipient(recipient.id)}
                >
                  ×
                </button>
              )}
            </div>
            )
          })
        )}
        <Button size="sm" variant="ghost" icon={UserPlus} onClick={onAddRecipient}>
          Add Recipient
        </Button>
      </div>

      <div className="builder-toolbar-controls">
        <Select
          label="Assign to"
          value={activeAssignRole}
          onChange={(event) => handleAssignRoleChange(event.target.value)}
          disabled={recipients.length === 0}
          options={assignToOptions}
          className="builder-toolbar-control-select"
          aria-label="Assign fields to investor or sponsor"
        />
        {recipients.length > 0 && !canPlaceFields && (
          <p className="builder-toolbar-control-hint">
            Add an {getAssignToLabel(activeAssignRole)} recipient to place fields.
          </p>
        )}
      </div>
    </div>
  )
}
