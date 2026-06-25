import { formatProfileType, type ProfileScopeSelection } from '../constants/fieldTypes'
import type { DocumentField, ProfileType } from '../types'

export function getFieldProfileTypes(field: DocumentField): ProfileType[] | undefined {
  const raw = field.profileTypes
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as ProfileType[]
      }
    } catch {
      // ignore malformed profile scope payloads
    }
  }
  if (field.profileType) {
    return [field.profileType]
  }
  return undefined
}

export function fieldAppliesToProfile(field: DocumentField, profileType: ProfileType): boolean {
  const types = getFieldProfileTypes(field)
  return !types?.length || types.includes(profileType)
}

export function isAllProfilesScope(profileTypes: ProfileType[] | undefined): boolean {
  return !profileTypes?.length
}

export function formatFieldProfileScope(field: DocumentField): string {
  const types = getFieldProfileTypes(field)
  if (!types?.length) {
    return 'All profiles'
  }
  if (types.length === 1) {
    return formatProfileType(types[0])
  }
  return `${types.length} profiles`
}

export function getFieldProfileScope(field: DocumentField): ProfileScopeSelection {
  const types = getFieldProfileTypes(field)
  if (!types?.length) {
    return 'all'
  }
  return types
}
