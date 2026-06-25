import type { NextFunction, Response } from 'express';
import type { RequestWithAuth } from './user-context.middleware';
import { validateBody } from './validate.middleware';
import { AppError } from '../utils/app-error';
import { createDocumentSchema } from '../validators/app.validators';
import { isMultipartRequest } from './upload.middleware';

interface RequestWithUpload extends RequestWithAuth {
  file?: Express.Multer.File;
}

export function validateCreateDocument(
  req: RequestWithUpload,
  res: Response,
  next: NextFunction,
): void {
  if (isMultipartRequest(req) || req.file) {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (!title) {
      next(new AppError('Title is required', 400, 'VALIDATION_ERROR'));
      return;
    }

    if (!req.file) {
      next(new AppError('PDF file is required', 400, 'VALIDATION_ERROR'));
      return;
    }

    const rawPages = req.body.pages;
    const pages =
      rawPages === undefined || rawPages === ''
        ? undefined
        : Number.parseInt(String(rawPages), 10);

    if (pages !== undefined && (!Number.isFinite(pages) || pages <= 0)) {
      next(new AppError('Pages must be a positive integer', 400, 'VALIDATION_ERROR'));
      return;
    }

    req.body = { title, pages };
    next();
    return;
  }

  validateBody(createDocumentSchema)(req, res, next);
}
