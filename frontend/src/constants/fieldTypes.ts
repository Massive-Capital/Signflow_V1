import type { FieldType, ProfileType, RecipientRole } from '../types'

export type ProfileScopeSelection = ProfileType[] | 'all'

/** Convert #RRGGBB to rgba for consistent tinted backgrounds */
export function colorWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized

  if (full.length !== 6) return hex

  const value = parseInt(full, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface AccentStyle {
  color: string
  softBg: string
  fieldBg: string
  border: string
  ring: string
}

function accentStyle(color: string): AccentStyle {
  return {
    color,
    softBg: colorWithAlpha(color, 0.1),
    fieldBg: colorWithAlpha(color, 0.16),
    border: colorWithAlpha(color, 0.42),
    ring: colorWithAlpha(color, 0.24),
  }
}

export const PROFILE_TYPE_OPTIONS: { value: ProfileType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'custodian_ira_401k', label: 'Custodian IRA or custodian based 401(k)' },
  { value: 'joint_tenancy', label: 'Joint tenancy' },
  {
    value: 'llc_corp_partnership_trust_solo_checkbook_ira',
    label: 'LLC, corp, partnership, trust, solo 401(k), or checkbook IRA',
  },
]

/** Investor profile palette — cool / jewel tones, distinct from recipient role colors */
export const PROFILE_TYPE_COLORS: Record<ProfileType, string> = {
  individual: '#0EA5E9',
  custodian_ira_401k: '#6366F1',
  joint_tenancy: '#D946EF',
  llc_corp_partnership_trust_solo_checkbook_ira: '#14B8A6',
}

export const PROFILE_TYPE_STYLES: Record<ProfileType, AccentStyle> = {
  individual: accentStyle(PROFILE_TYPE_COLORS.individual),
  custodian_ira_401k: accentStyle(PROFILE_TYPE_COLORS.custodian_ira_401k),
  joint_tenancy: accentStyle(PROFILE_TYPE_COLORS.joint_tenancy),
  llc_corp_partnership_trust_solo_checkbook_ira: accentStyle(
    PROFILE_TYPE_COLORS.llc_corp_partnership_trust_solo_checkbook_ira,
  ),
}

export function getProfileTypeColor(profileType: ProfileType): string {
  return PROFILE_TYPE_COLORS[profileType] ?? '#64748b'
}

export function getProfileTypeStyle(profileType: ProfileType): AccentStyle {
  return PROFILE_TYPE_STYLES[profileType] ?? accentStyle('#64748b')
}

/** Recipient role palette — warm / bold tones, kept separate from profile types */
export const RECIPIENT_ROLE_COLORS: Record<RecipientRole, string> = {
  buyer: '#3B6CF5',
  seller: '#9333EA',
  recipient_a: '#F43F5E',
  recipient_b: '#F97316',
  recipient_c: '#22C55E',
}

export const RECIPIENT_ROLE_STYLES: Record<RecipientRole, AccentStyle> = {
  buyer: accentStyle(RECIPIENT_ROLE_COLORS.buyer),
  seller: accentStyle(RECIPIENT_ROLE_COLORS.seller),
  recipient_a: accentStyle(RECIPIENT_ROLE_COLORS.recipient_a),
  recipient_b: accentStyle(RECIPIENT_ROLE_COLORS.recipient_b),
  recipient_c: accentStyle(RECIPIENT_ROLE_COLORS.recipient_c),
}

export const RECIPIENT_COLORS = Object.values(RECIPIENT_ROLE_COLORS)

export function getRecipientRoleColor(role: RecipientRole, index = 0): string {
  return RECIPIENT_ROLE_COLORS[role] ?? RECIPIENT_COLORS[index % RECIPIENT_COLORS.length]
}

export function getRecipientRoleStyle(role: RecipientRole, index = 0): AccentStyle {
  const color = getRecipientRoleColor(role, index)
  return RECIPIENT_ROLE_STYLES[role] ?? accentStyle(color)
}

export const BUILDER_ASSIGN_TO_OPTIONS = [
  { value: 'buyer' as const, label: 'Investor (Buyer)' },
  { value: 'seller' as const, label: 'Sponsor (Seller)' },
]

export const RECIPIENT_ROLE_OPTIONS: { value: RecipientRole; label: string }[] = [
  { value: 'buyer', label: 'Investor (Buyer)' },
  { value: 'seller', label: 'Sponsor (Seller)' },
  { value: 'recipient_a', label: 'Recipient A' },
  { value: 'recipient_b', label: 'Recipient B' },
  { value: 'recipient_c', label: 'Recipient C' },
]

export const BUILDER_RECIPIENT_ROLE_OPTIONS: { value: RecipientRole; label: string }[] = [
  { value: 'buyer', label: 'Investor (Buyer)' },
  { value: 'seller', label: 'Sponsor (Seller)' },
]

export function formatProfileType(profileType: ProfileType): string {
  return PROFILE_TYPE_OPTIONS.find((option) => option.value === profileType)?.label ?? profileType
}

export function getAssignToLabel(role: 'buyer' | 'seller'): string {
  return BUILDER_ASSIGN_TO_OPTIONS.find((option) => option.value === role)?.label ?? role
}

export function formatRecipientRole(role: RecipientRole): string {
  return RECIPIENT_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role
}

export const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: 'signature', label: 'Signature', icon: '✍' },
  { type: 'initial', label: 'Initial', icon: '🔤' },
  { type: 'date', label: 'Date', icon: '📅' },
  { type: 'text', label: 'Text/Name', icon: '📝' },
  { type: 'number', label: 'Number', icon: '🔢' },
  { type: 'checkbox', label: 'Checkbox', icon: '☑' },
  { type: 'radio', label: 'Radio', icon: '⭕' },
  { type: 'address', label: 'Address', icon: '🏠' },
  { type: 'phone', label: 'Phone', icon: '📞' },
  { type: 'email', label: 'Email', icon: '✉' },
]

export function getDefaultFieldSize(type: FieldType): { width: number; height: number } {
  switch (type) {
    case 'signature':
      return { width: 18, height: 4 }
    case 'initial':
      return { width: 12, height: 3.5 }
    case 'checkbox':
      return { width: 4, height: 3 }
    case 'radio':
      return { width: 18, height: 3.5 }
    case 'number':
      return { width: 16, height: 3.5 }
    default:
      return { width: 14, height: 3.5 }
  }
}

export const DOCUMENT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
]

export const SEND_WORKFLOW_STEPS = ['Recipients', 'Workflow Type', 'Email Message', 'Review', 'Send']
