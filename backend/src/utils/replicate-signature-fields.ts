const SIGNING_FIELD_TYPES = new Set(['signature', 'initial']);

type SigningFieldRow = {
  id: string;
  type: string;
  recipient_id: string;
};

export function replicateRecipientSignatureFieldValues(
  recipientFields: SigningFieldRow[],
  fieldValues: Record<string, string>,
): Record<string, string> {
  const merged = { ...fieldValues };

  for (const fieldType of SIGNING_FIELD_TYPES) {
    const sourceField = recipientFields.find(
      (field) =>
        field.type === fieldType && String(merged[field.id] ?? '').trim(),
    );
    if (!sourceField) continue;

    const sourceValue = String(merged[sourceField.id]).trim();
    for (const field of recipientFields) {
      if (field.type !== fieldType) continue;
      if (field.id === sourceField.id) continue;
      if (String(merged[field.id] ?? '').trim()) continue;
      merged[field.id] = sourceValue;
    }
  }

  return merged;
}
