import { describe, expect, it } from 'vitest';
import {
  buildWebhookSignatureHeaders,
  signWebhookPayload,
  verifyWebhookSignature,
} from '../src/utils/webhook-signature';

describe('webhook signatures', () => {
  it('signs and verifies payloads consistently', () => {
    const secret = 'whsec_test_secret';
    const body = JSON.stringify({ event: 'document.completed', payload: { id: '1' } });
    const headers = buildWebhookSignatureHeaders(secret, body);
    const timestamp = headers['SignFlow-Timestamp'];
    const signature = headers['SignFlow-Signature'].split('v1=')[1] ?? '';

    expect(verifyWebhookSignature(secret, timestamp, body, signature)).toBe(true);
    expect(signWebhookPayload(secret, timestamp, body)).toBe(signature);
  });
});
