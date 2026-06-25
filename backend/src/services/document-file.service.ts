import { readFile, writeFile } from 'fs/promises';
import { documentRepository } from '../repositories/document.repository';
import type { DocumentRow } from '../utils/mappers';
import { AppError } from '../utils/app-error';
import { assertBufferHash, hashBuffer } from '../utils/crypto';
import { getOriginalPdfPath, getSignedPdfPath } from '../utils/document-paths';

export class DocumentFileService {
  async persistOriginalPdf(
    documentId: string,
    buffer: Buffer,
    fileName: string,
  ): Promise<string> {
    const fileHash = hashBuffer(buffer);
    const filePath = getOriginalPdfPath(documentId);

    await writeFile(filePath, buffer);
    await documentRepository.setFileMetadata(documentId, { fileName, fileHash });

    return fileHash;
  }

  async hashAndStoreUploadedPdf(documentId: string, fileName: string): Promise<string> {
    const buffer = await readFile(getOriginalPdfPath(documentId));
    const fileHash = hashBuffer(buffer);
    await documentRepository.setFileMetadata(documentId, { fileName, fileHash });
    return fileHash;
  }

  async readOriginalPdf(documentId: string): Promise<{ buffer: Buffer; row: DocumentRow }> {
    const row = await documentRepository.findById(documentId);
    if (!row) {
      throw new AppError('Document not found', 404, 'NOT_FOUND');
    }

    if (!row.file_name) {
      throw new AppError('Document file has not been uploaded yet', 404, 'NOT_FOUND');
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(getOriginalPdfPath(documentId));
    } catch {
      throw new AppError('Document file not found. Please upload the PDF again.', 404, 'NOT_FOUND');
    }

    if (row.file_hash) {
      assertBufferHash(buffer, row.file_hash, 'Document file');
    } else {
      const fileHash = hashBuffer(buffer);
      await documentRepository.update(documentId, { fileHash });
      row.file_hash = fileHash;
    }

    return { buffer, row };
  }

  async persistSignedPdf(documentId: string, buffer: Buffer): Promise<string> {
    const signedFileHash = hashBuffer(buffer);
    await writeFile(getSignedPdfPath(documentId), buffer);
    await documentRepository.update(documentId, { signedFileHash });
    return signedFileHash;
  }

  async readSignedPdf(documentId: string): Promise<Buffer> {
    const row = await documentRepository.findById(documentId);
    if (!row) {
      throw new AppError('Document not found', 404, 'NOT_FOUND');
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(getSignedPdfPath(documentId));
    } catch {
      throw new AppError('Signed document file not found', 404, 'NOT_FOUND');
    }

    if (row.signed_file_hash) {
      assertBufferHash(buffer, row.signed_file_hash, 'Signed document file');
    } else {
      const signedFileHash = hashBuffer(buffer);
      await documentRepository.update(documentId, { signedFileHash });
    }

    return buffer;
  }
}

export const documentFileService = new DocumentFileService();
