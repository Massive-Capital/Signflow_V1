import { existsSync, mkdirSync } from 'fs';
import { readFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { documentRepository } from '../repositories/document.repository';
import { AppError } from '../utils/app-error';

export const EMAIL_ATTACHMENT_DIR = join(process.cwd(), 'uploads', 'email-attachments');

if (!existsSync(EMAIL_ATTACHMENT_DIR)) {
  mkdirSync(EMAIL_ATTACHMENT_DIR, { recursive: true });
}

export interface EmailAttachmentMeta {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;

function getDocumentAttachmentDir(documentId: string): string {
  return join(EMAIL_ATTACHMENT_DIR, documentId);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]+/g, '_').trim() || 'attachment';
}

export class EmailAttachmentService {
  async list(documentId: string): Promise<EmailAttachmentMeta[]> {
    return documentRepository.getEmailAttachments(documentId);
  }

  async add(
    documentId: string,
    file: Express.Multer.File,
  ): Promise<EmailAttachmentMeta> {
    if (!file.buffer?.length) {
      throw new AppError('Attachment file is required', 400, 'VALIDATION_ERROR');
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new AppError('Each attachment must be 10MB or smaller', 400, 'VALIDATION_ERROR');
    }

    const existing = await documentRepository.getEmailAttachments(documentId);
    if (existing.length >= MAX_ATTACHMENTS) {
      throw new AppError('You can attach up to 10 files per email', 400, 'VALIDATION_ERROR');
    }

    const id = randomUUID();
    const safeOriginalName = sanitizeFileName(file.originalname);
    const storedName = `${id}-${safeOriginalName}`;
    const documentDir = getDocumentAttachmentDir(documentId);

    if (!existsSync(documentDir)) {
      mkdirSync(documentDir, { recursive: true });
    }

    const targetPath = join(documentDir, storedName);
    await writeFile(targetPath, file.buffer);

    const attachment: EmailAttachmentMeta = {
      id,
      fileName: storedName,
      originalName: safeOriginalName,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.size,
    };

    await documentRepository.setEmailAttachments(documentId, [...existing, attachment]);
    return attachment;
  }

  async remove(documentId: string, attachmentId: string): Promise<void> {
    const existing = await documentRepository.getEmailAttachments(documentId);
    const attachment = existing.find((item) => item.id === attachmentId);

    if (!attachment) {
      throw new AppError('Attachment not found', 404, 'NOT_FOUND');
    }

    const targetPath = join(getDocumentAttachmentDir(documentId), attachment.fileName);

    try {
      await unlink(targetPath);
    } catch {
      // file may already be missing
    }

    await documentRepository.setEmailAttachments(
      documentId,
      existing.filter((item) => item.id !== attachmentId),
    );
  }

  async getBuffers(
    documentId: string,
  ): Promise<Array<{ filename: string; content: Buffer; contentType?: string }>> {
    const attachments = await documentRepository.getEmailAttachments(documentId);
    const results: Array<{ filename: string; content: Buffer; contentType?: string }> = [];

    for (const attachment of attachments) {
      const targetPath = join(getDocumentAttachmentDir(documentId), attachment.fileName);
      try {
        const content = await readFile(targetPath);
        results.push({
          filename: attachment.originalName,
          content,
          contentType: attachment.mimeType,
        });
      } catch {
        // skip missing files
      }
    }

    return results;
  }
}

export const emailAttachmentService = new EmailAttachmentService();
