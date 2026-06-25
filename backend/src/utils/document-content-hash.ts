import { createHash } from 'crypto';
import type { FieldRow, RecipientRow } from './mappers';

interface DocumentContentInput {
  fileHash: string | null;
  pages: number;
  workflowType?: string | null;
  emailSubject?: string | null;
  emailMessage?: string | null;
  recipients: RecipientRow[];
  fields: FieldRow[];
}

export function computeDocumentContentHash(input: DocumentContentInput): string {
  const recipientById = new Map(input.recipients.map((recipient) => [recipient.id, recipient]));

  const recipients = [...input.recipients]
    .sort((a, b) => {
      const orderA = a.order_index ?? 999;
      const orderB = b.order_index ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.email.localeCompare(b.email);
    })
    .map((recipient) => ({
      name: recipient.name,
      email: recipient.email.toLowerCase(),
      role: recipient.role,
      order: recipient.order_index,
      profileType: recipient.profile_type,
    }));

  const fields = [...input.fields]
    .sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      const yDiff = Number(a.y) - Number(b.y);
      if (yDiff !== 0) return yDiff;
      return Number(a.x) - Number(b.x);
    })
    .map((field) => {
      const recipient = recipientById.get(field.recipient_id);
      return {
        type: field.type,
        label: field.label,
        x: Number(field.x),
        y: Number(field.y),
        width: Number(field.width),
        height: Number(field.height),
        page: field.page,
        required: field.required,
        radioGroupId: field.radio_group_id,
        profileType: field.profile_type,
        recipientEmail: recipient?.email.toLowerCase() ?? field.recipient_id,
      };
    });

  const payload = JSON.stringify({
    fileHash: input.fileHash,
    pages: input.pages,
    workflowType: input.workflowType ?? null,
    emailSubject: input.emailSubject?.trim() ?? null,
    emailMessage: input.emailMessage?.trim() ?? null,
    recipients,
    fields,
  });

  return createHash('sha256').update(payload).digest('hex');
}
