import type { DocumentField, FieldType } from '../types'
import { formatDisplayDateTime } from '../utils/date'
import { formatFieldDisplayValue, getSignatureImageSrc } from '../utils/pdf'
import { getRadioGroupId } from '../utils/radioField'

interface SigningFieldOverlayProps {
  field: DocumentField
  allFields?: DocumentField[]
  value?: string
  signedAt?: string
  isActive: boolean
  borderColor: string
  readOnly?: boolean
  onActivate: () => void
  onValueChange: (value: string) => void
  onSignatureRequest: () => void
}

function getInputType(type: FieldType): string {
  switch (type) {
    case 'email':
      return 'email'
    case 'phone':
      return 'tel'
    default:
      return 'text'
  }
}

function isSignatureField(type: FieldType): boolean {
  return type === 'signature' || type === 'initial'
}

function SignatureTimestamp({ signedAt }: { signedAt: string }) {
  return (
    <span className="signing-field-timestamp" title={`Signed ${formatDisplayDateTime(signedAt)}`}>
      {formatDisplayDateTime(signedAt)}
    </span>
  )
}

function SignatureFieldContent({
  field,
  value,
  signedAt,
  imageSrc,
}: {
  field: DocumentField
  value: string
  signedAt?: string
  imageSrc: string | null
}) {
  return (
    <div className="signing-field-signature-content">
      {imageSrc ? (
        <img src={imageSrc} alt={field.label} className="signing-field-image" />
      ) : (
        <span className="signing-field-text">{formatFieldDisplayValue(value)}</span>
      )}
      {signedAt ? <SignatureTimestamp signedAt={signedAt} /> : null}
    </div>
  )
}

export function SigningFieldOverlay({
  field,
  allFields,
  value,
  signedAt,
  isActive,
  borderColor,
  readOnly = false,
  onActivate,
  onValueChange,
  onSignatureRequest,
}: SigningFieldOverlayProps) {
  const isFilled = Boolean(value)
  const imageSrc = value ? getSignatureImageSrc(value) : null

  const handleSignatureClick = () => {
    if (readOnly) return
    onActivate()
    onSignatureRequest()
  }

  if (readOnly) {
    return (
      <div
        className={`signing-field signing-field--readonly ${isFilled ? 'filled' : ''}`}
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
          borderColor,
        }}
        aria-label={isFilled ? `${field.label} (completed)` : field.label}
        title={isFilled ? `${field.label} — already completed on the document` : undefined}
      />
    )
  }

  if (isSignatureField(field.type)) {
    return (
      <button
        type="button"
        className={`signing-field signing-field--signature ${isActive ? 'active' : ''} ${isFilled ? 'filled' : ''}`}
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
          borderColor,
        }}
        onClick={handleSignatureClick}
      >
        {isFilled ? (
          <SignatureFieldContent
            field={field}
            value={value!}
            signedAt={signedAt}
            imageSrc={imageSrc}
          />
        ) : (
          <span className="signing-field-text">{field.label}</span>
        )}
      </button>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <div
        className={`signing-field signing-field--checkbox ${isActive ? 'active' : ''} ${isFilled ? 'filled' : ''}`}
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
          borderColor,
        }}
        onClick={onActivate}
      >
        <label className="signing-field-checkbox">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(event) => onValueChange(event.target.checked ? 'true' : '')}
            onFocus={onActivate}
            aria-label={field.label}
          />
        </label>
      </div>
    )
  }

  if (field.type === 'radio') {
    const groupId = getRadioGroupId(field, allFields)
    const isSelected = value === 'selected'

    const handleRadioSelect = () => {
      onActivate()
      if (!isSelected) {
        onValueChange('selected')
      }
    }

    return (
      <div
        className={`signing-field signing-field--radio ${isActive ? 'active' : ''} ${isFilled ? 'filled' : ''}`}
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
          borderColor,
        }}
        onClick={handleRadioSelect}
      >
        <label className="signing-field-radio-option">
          <input
            type="radio"
            name={`radio-${groupId ?? field.id}`}
            checked={isSelected}
            onChange={handleRadioSelect}
            onClick={(event) => event.stopPropagation()}
            onFocus={onActivate}
            aria-label={field.label}
          />
          <span>{field.label}</span>
        </label>
      </div>
    )
  }

  const inputValue = value ? formatFieldDisplayValue(value) : ''

  if (field.type === 'date') {
    return (
      <div
        className={`signing-field signing-field--input signing-field--date ${isActive ? 'active' : ''} ${isFilled ? 'filled' : ''}`}
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
          borderColor,
        }}
        onClick={onActivate}
      >
        <input
          type="text"
          className="signing-field-input"
          value={inputValue}
          placeholder={field.label}
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={onActivate}
          aria-label={field.label}
        />
      </div>
    )
  }

  return (
    <div
      className={`signing-field signing-field--input ${isActive ? 'active' : ''} ${isFilled ? 'filled' : ''}`}
      style={{
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        height: `${field.height}%`,
        borderColor,
      }}
      onClick={onActivate}
    >
      <input
        type={getInputType(field.type)}
        className="signing-field-input"
        value={inputValue}
        placeholder={field.label}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={onActivate}
        aria-label={field.label}
      />
    </div>
  )
}
