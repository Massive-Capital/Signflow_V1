import type { Response } from 'express';
import type { RequestWithAuth } from '../middleware/user-context.middleware';
import { dashboardService } from '../services/dashboard.service';

export class DashboardController {
  getStats = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const stats = await dashboardService.getStats(req.auth!);
    res.json(stats);
  };
}

export const dashboardController = new DashboardController();
