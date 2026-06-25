import { useEffect, useState, type FormEvent } from 'react'
import { Save, UserPlus } from 'lucide-react'
import { Button } from '../ui/Button'
import { CancelButton } from '../ui/CancelButton'
import { Input, Select } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { PROFILE_TYPE_OPTIONS, RECIPIENT_ROLE_OPTIONS } from '../../constants/fieldTypes'
import type { ProfileType, RecipientRole } from '../../types'

export interface RecipientFormValues {
  name: string
  email: string
  role: RecipientRole
  profileType?: ProfileType
}

interface RecipientFormModalProps {
  open: boolean
  mode: 'add' | 'edit'
  initialValues?: RecipientFormValues
  roleOptions?: { value: RecipientRole; label: string }[]
  isSaving?: boolean
  onClose: () => void
  onSubmit: (values: RecipientFormValues) => void
}

const EMPTY_VALUES: RecipientFormValues = {
  name: '',
  email: '',
  role: 'buyer',
  profileType: 'individual',
}

function validate(values: RecipientFormValues): Partial<Record<keyof RecipientFormValues, string>> {
  const errors: Partial<Record<keyof RecipientFormValues, string>> = {}

  if (!values.name.trim()) {
    errors.name = 'Name is required'
  } else if (values.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address'
  }

  if (!values.role) {
    errors.role = 'Role is required'
  }

  if (values.role === 'buyer' && !values.profileType) {
    errors.profileType = 'Profile type is required for investors'
  }

  return errors
}

export function RecipientFormModal({
  open,
  mode,
  initialValues,
  roleOptions = RECIPIENT_ROLE_OPTIONS,
  isSaving,
  onClose,
  onSubmit,
}: RecipientFormModalProps) {
  const [values, setValues] = useState<RecipientFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<Partial<Record<keyof RecipientFormValues, string>>>({})

  useEffect(() => {
    if (!open) return
    setValues(initialValues ?? EMPTY_VALUES)
    setErrors({})
  }, [open, initialValues])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const trimmed: RecipientFormValues = {
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role,
      ...(values.role === 'buyer' ? { profileType: values.profileType ?? 'individual' } : {}),
    }

    const nextErrors = validate(trimmed)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSubmit(trimmed)
  }

  const isInvestor = values.role === 'buyer'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add Recipient' : 'Edit Recipient'}
      size="sm"
      footer={
        <>
          <CancelButton type="button" onClick={onClose} disabled={isSaving} />
          <Button
            type="submit"
            form="recipient-form"
            disabled={isSaving}
            icon={mode === 'add' ? UserPlus : Save}
          >
            {isSaving ? 'Saving...' : mode === 'add' ? 'Add Recipient' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form id="recipient-form" className="recipient-form" onSubmit={handleSubmit}>
        <Input
          label="Name"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          placeholder="Jane Smith"
          error={errors.name}
          autoFocus
        />
        <Input
          label="Email"
          type="email"
          value={values.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          placeholder="jane@example.com"
          error={errors.email}
        />
        <Select
          label="Role"
          value={values.role}
          onChange={(event) => {
            const role = event.target.value as RecipientRole
            setValues((current) => ({
              ...current,
              role,
              profileType: role === 'buyer' ? current.profileType ?? 'individual' : undefined,
            }))
          }}
          options={roleOptions}
          error={errors.role}
        />
        {isInvestor && (
          <Select
            label="Investor profile type"
            value={values.profileType ?? 'individual'}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                profileType: event.target.value as ProfileType,
              }))
            }
            options={PROFILE_TYPE_OPTIONS}
            error={errors.profileType}
          />
        )}
      </form>
    </Modal>
  )
}
