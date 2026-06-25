import type { Response } from 'express';
import type { RequestWithAuth } from '../middleware/user-context.middleware';
import { organizationService } from '../services/organization.service';
import { paramAsString } from '../utils/params';

export class OrganizationController {
  list = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const organizations = await organizationService.listForUser(req.userId!);
    res.json(organizations);
  };

  get = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const organization = await organizationService.get(req.auth!, paramAsString(req.params.id));
    res.json(organization);
  };

  update = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const organization = await organizationService.update(req.auth!, paramAsString(req.params.id), req.body);
    res.json(organization);
  };

  getSdkConfig = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const config = await organizationService.getSdkConfig(req.auth!);
    res.json(config);
  };

  updateSdkConfig = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const config = await organizationService.updateSdkConfig(req.auth!, req.body);
    res.json(config);
  };
}

export const organizationController = new OrganizationController();
