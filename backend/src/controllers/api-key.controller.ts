import type { Response } from 'express';
import type { RequestWithAuth } from '../middleware/user-context.middleware';
import { apiKeyService } from '../services/api-key.service';

export class ApiKeyController {
  list = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const keys = await apiKeyService.list(req.auth!);
    res.json(keys);
  };

  create = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const key = await apiKeyService.create(req.auth!, req.body.name, req.body.environment);
    res.status(201).json(key);
  };
}

export const apiKeyController = new ApiKeyController();
