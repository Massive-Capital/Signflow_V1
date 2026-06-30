import { webhookRepository } from '../repositories/webhook.repository';
import type { AuthContext, Webhook } from '../types/domain';
import { decryptSecret, encryptSecret, generateSecureToken, hashToken } from '../utils/crypto';
import { toWebhook } from '../utils/mappers';
import { assertWebhookUrlAllowed } from '../utils/webhook-url';
import { buildWebhookSignatureHeaders } from '../utils/webhook-signature';

export class WebhookService {
  async list(auth: AuthContext): Promise<Webhook[]> {
    const rows = await webhookRepository.listByOrganization(auth.organizationId);
    return rows.map((row) => toWebhook(row));
  }

  async create(auth: AuthContext, url: string, events: string[]): Promise<Webhook> {
    assertWebhookUrlAllowed(url);

    const secret = `whsec_${generateSecureToken(12)}`;

    const row = await webhookRepository.create({
      organizationId: auth.organizationId,
      url,
      events,
      secretHash: hashToken(secret),
      secretCiphertext: encryptSecret(secret),
    });

    return toWebhook(row, secret);
  }

  async dispatch(organizationId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    const webhooks = await webhookRepository.findActiveByEvent(organizationId, event);
    if (webhooks.length === 0) return;

    for (const webhook of webhooks) {
      try {
        assertWebhookUrlAllowed(webhook.url);

        const body = JSON.stringify({
          event,
          payload,
          timestamp: new Date().toISOString(),
          webhookId: webhook.id,
        });

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (webhook.secret_ciphertext) {
          try {
            const secret = decryptSecret(webhook.secret_ciphertext);
            Object.assign(headers, buildWebhookSignatureHeaders(secret, body));
          } catch (error) {
            console.error(`Webhook signing unavailable for ${webhook.url}:`, error);
          }
        }

        await fetch(webhook.url, {
          method: 'POST',
          headers,
          body,
        });
      } catch (error) {
        console.error(`Webhook delivery failed for ${webhook.url}:`, error);
      }
    }
  }
}

export const webhookService = new WebhookService();
