import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { PROFILE_TYPE_OPTIONS, getProfileTypeStyle } from '../../constants/fieldTypes'
import type { ProfileType } from '../../types'

interface SigningProfileStepProps {
  initialProfileType?: ProfileType
  isSaving?: boolean
  onConfirm: (profileType: ProfileType) => void | Promise<void>
}

export function SigningProfileStep({
  initialProfileType = 'individual',
  isSaving,
  onConfirm,
}: SigningProfileStepProps) {
  const [selectedProfileType, setSelectedProfileType] = useState<ProfileType>(initialProfileType)

  return (
    <div className="signing-profile-step">
      <div className="signing-profile-step-card card">
        <h1>Choose your investor profile</h1>
        <p className="signing-profile-step-intro">
          Select the profile type that applies to you. You will only see and sign fields relevant
          to this profile.
        </p>

        <div className="signing-profile-step-list" role="radiogroup" aria-label="Investor profile type">
          {PROFILE_TYPE_OPTIONS.map((option) => {
            const accent = getProfileTypeStyle(option.value)
            const isSelected = selectedProfileType === option.value

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`signing-profile-step-option ${isSelected ? 'signing-profile-step-option--selected' : ''}`}
                style={{
                  borderColor: isSelected ? accent.border : accent.ring,
                  backgroundColor: isSelected ? accent.softBg : 'var(--color-surface)',
                }}
                onClick={() => setSelectedProfileType(option.value)}
              >
                <span
                  className="signing-profile-step-dot"
                  style={{ backgroundColor: accent.color }}
                  aria-hidden
                />
                <span className="signing-profile-step-label">{option.label}</span>
              </button>
            )
          })}
        </div>

        <Button
          type="button"
          icon={ArrowRight}
          disabled={isSaving}
          onClick={() => onConfirm(selectedProfileType)}
        >
          {isSaving ? 'Saving...' : 'Continue to sign'}
        </Button>
      </div>
    </div>
  )
}
