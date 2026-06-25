import type { Response } from 'express';
import type { RequestWithAuth } from '../middleware/user-context.middleware';
import { webhookService } from '../services/webhook.service';

export class WebhookController {
  list = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const webhooks = await webhookService.list(req.auth!);
    res.json(webhooks);
  };

  create = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const webhook = await webhookService.create(req.auth!, req.body.url, req.body.events);
    res.status(201).json(webhook);
  };
}

export const webhookController = new WebhookController();
