import type { Response } from 'express';
import type { RequestWithAuth } from '../middleware/user-context.middleware';
import { teamService } from '../services/team.service';

export class TeamController {
  list = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const members = await teamService.listMembers(req.auth!);
    res.json(members);
  };
}

export const teamController = new TeamController();
