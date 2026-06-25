import { pool } from '../database/db';
import type { InvoiceRow } from '../utils/mappers';

export class BillingRepository {
  async listInvoices(organizationId: string): Promise<InvoiceRow[]> {
    const result = await pool.query<InvoiceRow>(
      `SELECT * FROM invoices
       WHERE organization_id = $1
       ORDER BY invoice_date DESC`,
      [organizationId],
    );
    return result.rows;
  }

  async getUsage(organizationId: string): Promise<{
    api_calls: number;
    embedded_sessions: number;
    documents_signed: number;
  }> {
    const result = await pool.query(
      `SELECT api_calls, embedded_sessions, documents_signed
       FROM usage_metrics
       WHERE organization_id = $1`,
      [organizationId],
    );

    if (result.rows[0]) {
      return result.rows[0];
    }

    await pool.query(
      `INSERT INTO usage_metrics (organization_id) VALUES ($1)
       ON CONFLICT (organization_id) DO NOTHING`,
      [organizationId],
    );

    return { api_calls: 0, embedded_sessions: 0, documents_signed: 0 };
  }

  async incrementUsage(
    organizationId: string,
    field: 'api_calls' | 'embedded_sessions' | 'documents_signed',
    amount = 1,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO usage_metrics (organization_id, ${field})
       VALUES ($1, $2)
       ON CONFLICT (organization_id)
       DO UPDATE SET ${field} = usage_metrics.${field} + $2, updated_at = NOW()`,
      [organizationId, amount],
    );
  }
}

export const billingRepository = new BillingRepository();
