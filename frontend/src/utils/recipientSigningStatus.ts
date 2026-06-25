import type { RecipientSigningStatus } from '../types'

const STATUS_LABELS: Record<RecipientSigningStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  viewed: 'Viewed',
  signed: 'Signed',
  awaiting_countersign: 'Counter-sign pending',
}

export function getRecipientSigningStatusLabel(
  status: RecipientSigningStatus | undefined,
): string | null {
  if (!status) return null
  return STATUS_LABELS[status]
}

export function shouldShowRecipientSigningStatus(
  documentStatus: string,
  status: RecipientSigningStatus | undefined,
): boolean {
  if (!status) return false
  return ['sent', 'pending', 'completed', 'declined'].includes(documentStatus)
}

export function getRecipientSigningTimestamp(
  status: RecipientSigningStatus,
  recipient: { sentAt?: string; viewedAt?: string; signedAt?: string },
): string | undefined {
  if (status === 'signed' || status === 'awaiting_countersign') return recipient.signedAt
  if (status === 'viewed') return recipient.viewedAt
  if (status === 'sent') return recipient.sentAt
  return undefined
}

export function getDocumentStatusTimestamp(
  status: string,
  document: { completedAt?: string; updatedAt: string },
): string | undefined {
  if (status === 'completed') {
    return document.completedAt ?? document.updatedAt
  }
  return undefined
}
