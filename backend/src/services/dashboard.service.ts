import { documentRepository } from '../repositories/document.repository';
import { billingRepository } from '../repositories/billing.repository';
import type { AuthContext } from '../types/domain';
import type { DashboardStats } from '../types/domain';

export class DashboardService {
  async getStats(auth: AuthContext): Promise<DashboardStats> {
    const counts = await documentRepository.countByStatus(auth.organizationId);
    const usage = await billingRepository.getUsage(auth.organizationId);

    const documentsSent = (counts.sent ?? 0) + (counts.pending ?? 0) + (counts.completed ?? 0);
    const completed = counts.completed ?? 0;
    const pending = (counts.pending ?? 0) + (counts.sent ?? 0);
    const limit = 10000;
    const monthlyUsage = Math.min(100, Math.round((usage.documents_signed / limit) * 100));

    return {
      documentsSent,
      completed,
      pending,
      apiCalls: usage.api_calls,
      embeddedSessions: usage.embedded_sessions,
      monthlyUsage,
    };
  }
}

export const dashboardService = new DashboardService();
