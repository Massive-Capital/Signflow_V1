import type { Response } from 'express';
import type { RequestWithAuth } from '../middleware/user-context.middleware';
import { documentService } from '../services/document.service';
import type { DocumentStatus } from '../types/domain';
import { AppError } from '../utils/app-error';
import { paramAsString } from '../utils/params';
import { getClientIp } from '../utils/client-ip';
import { buildContentDisposition } from '../utils/content-disposition';

interface RequestWithUpload extends RequestWithAuth {
  file?: Express.Multer.File;
}

export class DocumentController {
  list = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const status = req.query.status as DocumentStatus | undefined;
    const search = req.query.search as string | undefined;
    const documents = await documentService.list(req.auth!, { status, search });
    res.json(documents);
  };

  get = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const document = await documentService.get(req.auth!, paramAsString(req.params.id));
    res.json(document);
  };

  create = async (req: RequestWithUpload, res: Response): Promise<void> => {
    if (req.file) {
      const document = await documentService.createWithFile(
        req.auth!,
        req.body.title,
        req.file,
        req.body.pages,
      );
      res.status(201).json(document);
      return;
    }

    const document = await documentService.create(req.auth!, req.body.title, req.body.pages);
    res.status(201).json(document);
  };

  uploadFile = async (req: RequestWithUpload, res: Response): Promise<void> => {
    if (!req.file) {
      throw new AppError('PDF file is required', 400, 'VALIDATION_ERROR');
    }

    const document = await documentService.uploadFile(
      req.auth!,
      paramAsString(req.params.id),
      req.file.originalname,
    );
    res.json(document);
  };

  serveOriginal = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const { buffer, filename, fileHash } = await documentService.getOriginalPdf(
      req.auth!,
      paramAsString(req.params.id),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDisposition('inline', filename));
    if (fileHash) {
      res.setHeader('X-Document-Hash', fileHash);
      res.setHeader('X-Document-Hash-Algorithm', 'SHA-256');
    }
    res.send(buffer);
  };

  update = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const document = await documentService.update(
      req.auth!,
      paramAsString(req.params.id),
      req.body,
      getClientIp(req),
    );
    res.json(document);
  };

  delete = async (req: RequestWithAuth, res: Response): Promise<void> => {
    await documentService.delete(req.auth!, paramAsString(req.params.id));
    res.status(204).send();
  };

  previewSigned = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const { buffer, filename } = await documentService.downloadSigned(
      req.auth!,
      paramAsString(req.params.id),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDisposition('inline', filename));
    res.send(buffer);
  };

  downloadSigned = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const { buffer, filename } = await documentService.downloadSigned(
      req.auth!,
      paramAsString(req.params.id),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', filename));
    res.send(buffer);
  };

  previewRecipient = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const { buffer, filename } = await documentService.getRecipientSignedPdf(
      req.auth!,
      paramAsString(req.params.id),
      paramAsString(req.params.recipientId),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDisposition('inline', filename));
    res.send(buffer);
  };

  downloadRecipient = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const { buffer, filename } = await documentService.getRecipientSignedPdf(
      req.auth!,
      paramAsString(req.params.id),
      paramAsString(req.params.recipientId),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', filename));
    res.send(buffer);
  };

  uploadEmailAttachment = async (req: RequestWithUpload, res: Response): Promise<void> => {
    if (!req.file) {
      throw new AppError('Attachment file is required', 400, 'VALIDATION_ERROR');
    }

    const attachment = await documentService.addEmailAttachment(
      req.auth!,
      paramAsString(req.params.id),
      req.file,
    );
    res.status(201).json(attachment);
  };

  deleteEmailAttachment = async (req: RequestWithAuth, res: Response): Promise<void> => {
    await documentService.removeEmailAttachment(
      req.auth!,
      paramAsString(req.params.id),
      paramAsString(req.params.attachmentId),
    );
    res.status(204).send();
  };
}

export const documentController = new DocumentController();
