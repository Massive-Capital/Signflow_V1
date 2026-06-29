import { documentRepository } from '../repositories/document.repository';
import type { FieldRow, RecipientRow, DocumentRow } from './mappers';
import { computeDocumentContentHash } from './document-content-hash';
import { AppError } from './app-error';

const LOCKED_STATUSES = new Set(['sent', 'pending', 'completed', 'declined']);

function computeRowContentHash(
  row: DocumentRow,
  recipients: RecipientRow[],
  fields: FieldRow[],
): string {
  return computeDocumentContentHash({
    fileHash: row.file_hash,
    pages: row.pages,
    workflowType: row.workflow_type,
    emailSubject: row.email_subject,
    emailMessage: row.email_message,
    recipients,
    fields,
  });
}

export function assertDocumentContentIntegrity(
  row: DocumentRow,
  recipients: RecipientRow[],
  fields: FieldRow[],
): void {
  if (!LOCKED_STATUSES.has(row.status) || !row.sent_content_hash) {
    return;
  }

  const currentHash = computeRowContentHash(row, recipients, fields);

  if (currentHash !== row.sent_content_hash) {
    throw new AppError(
      'Document content integrity check failed. The document may have been altered after it was sent.',
      500,
      'INTEGRITY_ERROR',
    );
  }
}

/**
 * For in-flight sent documents, realign sent_content_hash when the portal patched
 * recipients/fields after send (e.g. sponsor assignment). Completed documents stay strict.
 */
export async function assertOrResyncDocumentContentIntegrity(
  row: DocumentRow,
  recipients: RecipientRow[],
  fields: FieldRow[],
): Promise<void> {
  if (!LOCKED_STATUSES.has(row.status) || !row.sent_content_hash) {
    return;
  }

  const currentHash = computeRowContentHash(row, recipients, fields);
  if (currentHash === row.sent_content_hash) {
    return;
  }

  if (['sent', 'pending'].includes(row.status)) {
    await documentRepository.update(row.id, { sentContentHash: currentHash });
    return;
  }

  throw new AppError(
    'Document content integrity check failed. The document may have been altered after it was sent.',
    500,
    'INTEGRITY_ERROR',
  );
}
