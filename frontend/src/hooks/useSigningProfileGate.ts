import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import {
  getSigningProfileInitialType,
  isSigningProfileConfirmed,
  markSigningProfileConfirmed,
  shouldChooseSigningProfile,
} from '../utils/signingProfile'
import type { Document, ProfileType } from '../types'
import { toast } from '../utils/toast'

export function useSigningProfileGate(
  token: string | undefined,
  document: Document | undefined,
  recipientId: string | undefined,
) {
  const queryClient = useQueryClient()
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileConfirmed, setProfileConfirmed] = useState(() =>
    token ? isSigningProfileConfirmed(token) : false,
  )

  const needsProfileStep =
    !profileConfirmed &&
    Boolean(token && document && recipientId) &&
    shouldChooseSigningProfile(document!, recipientId!, token!)

  const confirmProfile = async (profileType: ProfileType) => {
    if (!token) return

    setIsSavingProfile(true)

    try {
      await api.signing.setProfile(token, profileType)
      markSigningProfileConfirmed(token)
      setProfileConfirmed(true)
      await queryClient.invalidateQueries({ queryKey: ['signing-session', token] })
      toast.success('Profile saved.')
    } catch {
      toast.error('Unable to save your profile selection. Please try again.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const initialProfileType = getSigningProfileInitialType(
    document?.recipients.find((recipient) => recipient.id === recipientId)?.profileType,
  )

  return {
    needsProfileStep,
    isSavingProfile,
    initialProfileType,
    confirmProfile,
  }
}
