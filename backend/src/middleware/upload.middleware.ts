import { existsSync, mkdirSync } from 'fs';
import type { NextFunction, Request, Response } from 'express';
import multer, { type FileFilterCallback, type MulterError } from 'multer';
import { join } from 'path';
import { AppError } from '../utils/app-error';

export const DOCUMENT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'documents');

if (!existsSync(DOCUMENT_UPLOAD_DIR)) {
  mkdirSync(DOCUMENT_UPLOAD_DIR, { recursive: true });
}

function pdfFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  const isPdf =
    file.mimetype === 'application/pdf' ||
    file.originalname.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    cb(null, true);
    return;
  }

  cb(new AppError('Only PDF files are allowed', 400, 'VALIDATION_ERROR'));
}

export const createDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: pdfFileFilter,
});

export const documentUpload = multer({
  storage: multer.diskStorage({
    destination: DOCUMENT_UPLOAD_DIR,
    filename: (req, _file, cb) => {
      cb(null, `${req.params.id}.pdf`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: pdfFileFilter,
});

export const emailAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function isMultipartRequest(req: Request): boolean {
  const contentType = req.headers['content-type'];
  return (
    typeof contentType === 'string' &&
    contentType.toLowerCase().includes('multipart/form-data')
  );
}

export function optionalCreateDocumentUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isMultipartRequest(req)) {
    createDocumentUpload.single('file')(req, res, next);
    return;
  }
  next();
}

export function handleUploadError(
  error: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (error instanceof AppError) {
    next(error);
    return;
  }

  const multerError = error as MulterError;
  if (multerError?.code === 'LIMIT_FILE_SIZE') {
    next(new AppError('File must be 25MB or smaller', 400, 'VALIDATION_ERROR'));
    return;
  }

  next(error);
}
