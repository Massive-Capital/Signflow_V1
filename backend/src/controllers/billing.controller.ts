import type { Response } from 'express';
import type { RequestWithAuth } from '../middleware/user-context.middleware';
import { billingService } from '../services/billing.service';

export class BillingController {
  getInvoices = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const invoices = await billingService.getInvoices(req.auth!);
    res.json(invoices);
  };

  getUsage = async (req: RequestWithAuth, res: Response): Promise<void> => {
    const usage = await billingService.getUsage(req.auth!);
    res.json(usage);
  };
}

export const billingController = new BillingController();
