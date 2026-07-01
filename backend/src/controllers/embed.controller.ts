import type { Response } from 'express';
import type { RequestWithAuth } from '../middleware/user-context.middleware';
import { embedService } from '../services/embed.service';
import { paramAsString } from '../utils/params';

export class EmbedController {
  createSigningSession = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const body = req.body as {
      recipientEmail?: string;
      recipientId?: string;
      investorRecipientId?: string;
      profileType?: string;
    };
    const result = await embedService.createSigningSession(
      req.auth!,
      paramAsString(req.params.id),
      {
        recipientEmail: body.recipientEmail,
        recipientId: body.recipientId,
        investorRecipientId: body.investorRecipientId,
        profileType: body.profileType,
      },
    );
    res.status(201).json(result);
  };
}

export const embedController = new EmbedController();
