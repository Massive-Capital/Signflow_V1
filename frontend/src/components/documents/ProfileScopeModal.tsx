import { useEffect, useState, type CSSProperties } from 'react'
import { MapPin, Save } from 'lucide-react'
import { Button } from '../ui/Button'
import { CancelButton } from '../ui/CancelButton'
import { Modal } from '../ui/Modal'
import { PROFILE_TYPE_OPTIONS, getProfileTypeStyle } from '../../constants/fieldTypes'
import type { ProfileScopeSelection } from '../../constants/fieldTypes'
import type { ProfileType } from '../../types'

export type { ProfileScopeSelection } from '../../constants/fieldTypes'

interface ProfileScopeModalProps {
  open: boolean
  fieldLabel: string
  initialScope?: ProfileScopeSelection
  mode?: 'place' | 'edit'
  onClose: () => void
  onConfirm: (scope: ProfileScopeSelection) => void
}

export function ProfileScopeModal({
  open,
  fieldLabel,
  initialScope = 'all',
  mode = 'place',
  onClose,
  onConfirm,
}: ProfileScopeModalProps) {
  const [applyToAll, setApplyToAll] = useState(true)
  const [selectedTypes, setSelectedTypes] = useState<ProfileType[]>([])

  useEffect(() => {
    if (!open) return

    if (initialScope === 'all') {
      setApplyToAll(true)
      setSelectedTypes([])
      return
    }

    setApplyToAll(false)
    setSelectedTypes(initialScope)
  }, [open, initialScope])

  const toggleProfileType = (profileType: ProfileType) => {
    setSelectedTypes((current) =>
      current.includes(profileType)
        ? current.filter((type) => type !== profileType)
        : [...current, profileType],
    )
  }

  const handleConfirm = () => {
    if (applyToAll) {
      onConfirm('all')
      return
    }

    if (selectedTypes.length === 0) {
      return
    }

    onConfirm(selectedTypes)
  }

  const canConfirm = applyToAll || selectedTypes.length > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profile types for this field"
      size="lg"
      footer={
        <>
          <CancelButton type="button" onClick={onClose} />
          <Button
            type="button"
            icon={mode === 'edit' ? Save : MapPin}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {mode === 'edit' ? 'Save profile scope' : 'Place field'}
          </Button>
        </>
      }
    >
      <div className="profile-scope-modal">
        <div className="profile-scope-field">
          <span className="profile-scope-field-kicker">
            {mode === 'edit' ? 'Editing field' : 'Placing field'}
          </span>
          <span className="profile-scope-field-name">{fieldLabel}</span>
        </div>

        <p className="profile-scope-intro">
          {mode === 'edit'
            ? 'Update which investor profile types should see this field on the document.'
            : 'Choose which investor profile types should see this field on the document.'}
        </p>

        <div
          className="profile-scope-mode"
          role="tablist"
          aria-label="Profile visibility mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={applyToAll}
            className={`profile-scope-mode-btn ${applyToAll ? 'profile-scope-mode-btn--active' : ''}`}
            onClick={() => {
              setApplyToAll(true)
              setSelectedTypes([])
            }}
          >
            All profiles
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!applyToAll}
            className={`profile-scope-mode-btn ${!applyToAll ? 'profile-scope-mode-btn--active' : ''}`}
            onClick={() => setApplyToAll(false)}
          >
            Specific profiles
          </button>
        </div>

        {applyToAll ? (
          <div className="profile-scope-all-summary">
            <span className="profile-scope-all-icon" aria-hidden>
              ✓
            </span>
            <div className="profile-scope-all-copy">
              <strong>Visible to every investor profile</strong>
              <span>Use this when the same field applies to all profile types.</span>
            </div>
          </div>
        ) : (
          <div className="profile-scope-specific">
            <div className="profile-scope-list" role="group" aria-label="Select profile types">
              {PROFILE_TYPE_OPTIONS.map((option) => {
                const accent = getProfileTypeStyle(option.value)
                const isChecked = selectedTypes.includes(option.value)

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`profile-scope-option ${isChecked ? 'profile-scope-option--checked' : ''}`}
                    style={
                      {
                        '--profile-accent': accent.color,
                      } as CSSProperties
                    }
                    aria-pressed={isChecked}
                    onClick={() => toggleProfileType(option.value)}
                  >
                    <span className="profile-scope-option-top">
                      <span
                        className="chip-dot chip-dot--accent"
                        style={{ background: accent.color, ['--chip-color' as string]: accent.color }}
                      />
                      <span
                        className={`profile-scope-option-check ${isChecked ? 'profile-scope-option-check--checked' : ''}`}
                        aria-hidden
                      >
                        {isChecked && (
                          <svg viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 6L5 8.5L9.5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                    </span>
                    <span className="profile-scope-option-label">{option.label}</span>
                  </button>
                )
              })}
            </div>

            {selectedTypes.length === 0 ? (
              <p className="profile-scope-error" role="alert">
                Select at least one profile type to continue.
              </p>
            ) : (
              <p className="profile-scope-selection-hint">
                {selectedTypes.length} profile{selectedTypes.length === 1 ? '' : 's'} selected
              </p>
            )}
          </div>
        )}

      </div>
    </Modal>
  )
}
