import { pool } from '../database/db';
import type { WebhookRow } from '../utils/mappers';

interface CreateWebhookInput {
  organizationId: string;
  url: string;
  events: string[];
  secretHash: string;
  secretCiphertext: string;
  retries?: number;
}

export class WebhookRepository {
  async listByOrganization(organizationId: string): Promise<WebhookRow[]> {
    const result = await pool.query<WebhookRow>(
      `SELECT * FROM webhooks WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId],
    );
    return result.rows;
  }

  async create(input: CreateWebhookInput): Promise<WebhookRow> {
    const result = await pool.query<WebhookRow>(
      `INSERT INTO webhooks (organization_id, url, events, secret_hash, secret_ciphertext, retries)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.organizationId,
        input.url,
        input.events,
        input.secretHash,
        input.secretCiphertext,
        input.retries ?? 3,
      ],
    );
    return result.rows[0];
  }

  async findActiveByEvent(organizationId: string, event: string): Promise<WebhookRow[]> {
    const result = await pool.query<WebhookRow>(
      `SELECT * FROM webhooks
       WHERE organization_id = $1 AND active = TRUE AND $2 = ANY(events)`,
      [organizationId, event],
    );
    return result.rows;
  }
}

export const webhookRepository = new WebhookRepository();
