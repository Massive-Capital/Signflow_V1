import { createHmac, timingSafeEqual } from 'crypto';

export function signWebhookPayload(secret: string, timestamp: string, body: string): string {
  const payload = `${timestamp}.${body}`;
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function buildWebhookSignatureHeaders(
  secret: string,
  body: string,
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signWebhookPayload(secret, timestamp, body);

  return {
    'Content-Type': 'application/json',
    'SignFlow-Signature': `t=${timestamp},v1=${signature}`,
    'SignFlow-Timestamp': timestamp,
  };
}

export function verifyWebhookSignature(
  secret: string,
  timestamp: string,
  body: string,
  signature: string,
): boolean {
  const expected = signWebhookPayload(secret, timestamp, body);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
