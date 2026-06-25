import type { Request, Response } from 'express';
import { signingService } from '../services/signing.service';
import { paramAsString } from '../utils/params';
import { getClientIp } from '../utils/client-ip';
import { buildContentDisposition } from '../utils/content-disposition';

export class SigningController {
  getSession = async (req: Request, res: Response): Promise<void> => {
    const session = await signingService.getSession(
      paramAsString(req.params.token),
      getClientIp(req),
    );
    res.json(session);
  };

  serveDocument = async (req: Request, res: Response): Promise<void> => {
    const { buffer, filename } = await signingService.getSessionDocumentPdf(
      paramAsString(req.params.token),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDisposition('inline', filename));
    res.send(buffer);
  };

  complete = async (req: Request, res: Response): Promise<void> => {
    const result = await signingService.complete(
      paramAsString(req.params.token),
      req.body.fieldValues,
      getClientIp(req),
    );
    res.json(result);
  };

  decline = async (req: Request, res: Response): Promise<void> => {
    const result = await signingService.decline(paramAsString(req.params.token));
    res.json(result);
  };

  download = async (req: Request, res: Response): Promise<void> => {
    const { buffer, filename } = await signingService.downloadCompletedDocument(
      paramAsString(req.params.token),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', filename));
    res.send(buffer);
  };

  preview = async (req: Request, res: Response): Promise<void> => {
    const { buffer, filename } = await signingService.downloadCompletedDocument(
      paramAsString(req.params.token),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDisposition('inline', filename));
    res.send(buffer);
  };

  setProfile = async (req: Request, res: Response): Promise<void> => {
    const result = await signingService.setRecipientProfile(
      paramAsString(req.params.token),
      req.body.profileType,
    );
    res.json(result);
  };
}

export const signingController = new SigningController();
