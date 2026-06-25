import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: LucideIcon
}

export function Input({ label, error, id, className = '', icon: Icon, type, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const isPasswordField = type === 'password'
  const [passwordVisible, setPasswordVisible] = useState(false)
  const resolvedType = isPasswordField ? (passwordVisible ? 'text' : 'password') : type

  const wrapperClassName = [
    Icon ? 'input-with-icon' : '',
    isPasswordField ? 'input-password' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const input = (
    <input
      id={inputId}
      type={resolvedType}
      className={error ? 'input-error' : ''}
      {...props}
    />
  )

  const fieldControl =
    Icon || isPasswordField ? (
      <div className={wrapperClassName}>
        {Icon && <Icon className="input-icon" size={16} strokeWidth={2} aria-hidden />}
        {input}
        {isPasswordField && (
          <button
            type="button"
            className="input-password-toggle"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={passwordVisible}
          >
            {passwordVisible ? (
              <EyeOff size={16} strokeWidth={2} aria-hidden />
            ) : (
              <Eye size={16} strokeWidth={2} aria-hidden />
            )}
          </button>
        )}
      </div>
    ) : (
      input
    )

  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={inputId}>{label}</label>}
      {fieldControl}
      {error && <span className="input-error-text">{error}</span>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, id, className = '', ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <textarea id={inputId} className={error ? 'input-error' : ''} {...props} />
      {error && <span className="input-error-text">{error}</span>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string; disabled?: boolean }[]
  error?: string
}

export function Select({ label, options, id, className = '', error, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <select id={inputId} className={error ? 'input-error' : ''} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  )
}
