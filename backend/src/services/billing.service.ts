import { billingRepository } from '../repositories/billing.repository';
import type { AuthContext, Invoice, UsageSummary } from '../types/domain';
import { toInvoice } from '../utils/mappers';

export class BillingService {
  async getInvoices(auth: AuthContext): Promise<Invoice[]> {
    const rows = await billingRepository.listInvoices(auth.organizationId);
    return rows.map(toInvoice);
  }

  async getUsage(auth: AuthContext): Promise<UsageSummary> {
    const usage = await billingRepository.getUsage(auth.organizationId);
    return {
      apiCalls: usage.api_calls,
      embeddedSessions: usage.embedded_sessions,
      documentsSigned: usage.documents_signed,
      limit: 10000,
    };
  }
}

export const billingService = new BillingService();
