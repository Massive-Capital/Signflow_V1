import type { Document, ProfileType } from '../types'
import { isInvestorSponsorWorkflow } from './investorSponsorWorkflow'

const profileConfirmedKey = (token: string) => `signflow_profile_${token}`

export function isSigningProfileConfirmed(token: string): boolean {
  return sessionStorage.getItem(profileConfirmedKey(token)) === '1'
}

export function markSigningProfileConfirmed(token: string): void {
  sessionStorage.setItem(profileConfirmedKey(token), '1')
}

export function shouldChooseSigningProfile(
  document: Document,
  recipientId: string,
  token: string,
): boolean {
  if (isSigningProfileConfirmed(token)) return false

  const recipient = document.recipients.find((item) => item.id === recipientId)
  if (!recipient || recipient.role !== 'buyer') return false

  if (recipient.profileType) return false

  return isInvestorSponsorWorkflow(document.recipients)
}

export function getSigningProfileInitialType(
  profileType?: ProfileType,
): ProfileType {
  return profileType ?? 'individual'
}
