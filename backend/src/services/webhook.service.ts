import { webhookRepository } from '../repositories/webhook.repository';
import type { AuthContext, Webhook } from '../types/domain';
import { generateSecureToken, hashToken } from '../utils/crypto';
import { toWebhook } from '../utils/mappers';

export class WebhookService {
  async list(auth: AuthContext): Promise<Webhook[]> {
    const rows = await webhookRepository.listByOrganization(auth.organizationId);
    return rows.map((row) => toWebhook(row));
  }

  async create(auth: AuthContext, url: string, events: string[]): Promise<Webhook> {
    const secret = `whsec_${generateSecureToken(12)}`;

    const row = await webhookRepository.create({
      organizationId: auth.organizationId,
      url,
      events,
      secretHash: hashToken(secret),
    });

    return toWebhook(row, secret);
  }

  async dispatch(organizationId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    const webhooks = await webhookRepository.findActiveByEvent(organizationId, event);
    if (webhooks.length === 0) return;

    for (const webhook of webhooks) {
      try {
        await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
        });
      } catch (error) {
        console.error(`Webhook delivery failed for ${webhook.url}:`, error);
      }
    }
  }
}

export const webhookService = new WebhookService();
