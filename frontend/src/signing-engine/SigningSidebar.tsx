import { ChevronLeft, ChevronRight, CircleCheck, XCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { collapseRadioGroupsForValidation, getRadioGroupId, isRadioGroupFilled, areRequiredFieldsComplete } from '../utils/radioField'
import type { DocumentField } from '../types'

interface SigningSidebarProps {
  fields: DocumentField[]
  fieldValues: Record<string, string>
  currentFieldIndex: number
  progress: number
  onNext: () => void
  onPrevious: () => void
  onComplete: () => void
  onDecline?: () => void
}

function isFieldComplete(field: DocumentField, fields: DocumentField[], fieldValues: Record<string, string>): boolean {
  if (field.type === 'radio') {
    const groupId = getRadioGroupId(field, fields)
    return groupId ? isRadioGroupFilled(fields, fieldValues, groupId) : Boolean(fieldValues[field.id])
  }
  return Boolean(fieldValues[field.id])
}

export function SigningSidebar({
  fields,
  fieldValues,
  currentFieldIndex,
  progress,
  onNext,
  onPrevious,
  onComplete,
  onDecline,
}: SigningSidebarProps) {
  const requiredFields = collapseRadioGroupsForValidation(fields.filter((field) => field.required))
  const currentField = requiredFields[currentFieldIndex]
  const canComplete = areRequiredFieldsComplete(fields, fieldValues)

  return (
    <aside className="signing-sidebar">
      <h3>Signing Guide</h3>

      <div className="progress-section">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-text">{progress}% complete</span>
      </div>

      {currentField && (
        <div className="current-field-info">
          <span className="field-step">Field {currentFieldIndex + 1} of {requiredFields.length}</span>
          <strong>{currentField.label}</strong>
          <span className="field-type-tag">{currentField.type}</span>
        </div>
      )}

      <div className="sidebar-nav-buttons">
        <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={onPrevious} disabled={currentFieldIndex === 0}>
          Previous field
        </Button>
        <Button variant="secondary" size="sm" iconRight={ChevronRight} onClick={onNext} disabled={currentFieldIndex >= requiredFields.length - 1}>
          Next required field
        </Button>
      </div>

      <ul className="field-checklist">
        {requiredFields.map((field, i) => {
          const done = isFieldComplete(field, fields, fieldValues)
          return (
            <li key={field.id} className={done ? 'done' : i === currentFieldIndex ? 'current' : ''}>
              {done ? '✓' : '○'} {field.label}
            </li>
          )
        })}
      </ul>

      <div className="sidebar-actions">
        <Button
          fullWidth
          icon={CircleCheck}
          onClick={onComplete}
          disabled={!canComplete}
          title={canComplete ? undefined : 'Complete all required fields to enable signing'}
        >
          Complete Signing
        </Button>
        {onDecline && (
          <Button fullWidth variant="ghost" icon={XCircle} onClick={onDecline}>
            Decline
          </Button>
        )}
      </div>
    </aside>
  )
}
