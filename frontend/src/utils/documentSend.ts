import type { Document } from '../types'

const NON_SENDABLE_STATUSES = new Set<Document['status']>(['completed', 'declined'])

export function canSendForSignature(document: Document): boolean {
  if (NON_SENDABLE_STATUSES.has(document.status)) {
    return false
  }

  if (document.recipients.length === 0) {
    return false
  }

  if (document.status === 'draft') {
    return true
  }

  return Boolean(document.hasUnsentChanges)
}

export function getSendDisabledReason(document: Document): string | undefined {
  if (NON_SENDABLE_STATUSES.has(document.status)) {
    return 'This document can no longer be sent for signature.'
  }

  if (document.recipients.length === 0) {
    return 'Add at least one recipient before sending.'
  }

  if (document.status !== 'draft' && !document.hasUnsentChanges) {
    return 'Already sent. Edit the document to send again.'
  }

  return undefined
}
