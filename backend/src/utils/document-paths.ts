import { join } from 'path';
import { DOCUMENT_UPLOAD_DIR } from '../middleware/upload.middleware';

export function getOriginalPdfPath(documentId: string): string {
  return join(DOCUMENT_UPLOAD_DIR, `${documentId}.pdf`);
}

export function getSignedPdfPath(documentId: string): string {
  return join(DOCUMENT_UPLOAD_DIR, `${documentId}-signed.pdf`);
}
