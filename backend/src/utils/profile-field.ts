import type { ProfileType } from '../types/domain';
import type { FieldRow } from './mappers';

function getFieldProfileTypes(field: FieldRow): ProfileType[] | undefined {
  let raw: unknown = field.profile_types;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as ProfileType[];
  }
  if (field.profile_type) {
    return [field.profile_type as ProfileType];
  }
  return undefined;
}

export function fieldAppliesToProfile(field: FieldRow, profileType: ProfileType): boolean {
  const types = getFieldProfileTypes(field);
  return !types?.length || types.includes(profileType);
}

export function filterFieldsForRecipientProfile(
  fields: FieldRow[],
  recipientId: string,
  profileType: ProfileType | null | undefined,
): FieldRow[] {
  return fields.filter((field) => {
    if (field.recipient_id !== recipientId) return false;
    if (!profileType) return true;
    return fieldAppliesToProfile(field, profileType);
  });
}
