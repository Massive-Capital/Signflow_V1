import type { FieldRow, RecipientRow, DocumentRow } from './mappers';
import { computeDocumentContentHash } from './document-content-hash';
import { AppError } from './app-error';

const LOCKED_STATUSES = new Set(['sent', 'pending', 'completed', 'declined']);

export function assertDocumentContentIntegrity(
  row: DocumentRow,
  recipients: RecipientRow[],
  fields: FieldRow[],
): void {
  if (!LOCKED_STATUSES.has(row.status) || !row.sent_content_hash) {
    return;
  }

  const currentHash = computeDocumentContentHash({
    fileHash: row.file_hash,
    pages: row.pages,
    workflowType: row.workflow_type,
    emailSubject: row.email_subject,
    emailMessage: row.email_message,
    recipients,
    fields,
  });

  if (currentHash !== row.sent_content_hash) {
    throw new AppError(
      'Document content integrity check failed. The document may have been altered after it was sent.',
      500,
      'INTEGRITY_ERROR',
    );
  }
}
