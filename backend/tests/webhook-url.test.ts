import { describe, expect, it } from 'vitest';
import { AppError } from '../src/utils/app-error';
import { assertWebhookUrlAllowed } from '../src/utils/webhook-url';

describe('assertWebhookUrlAllowed', () => {
  it('allows public https URLs', () => {
    const url = assertWebhookUrlAllowed('https://example.com/webhooks/signflow');
    expect(url.hostname).toBe('example.com');
  });

  it('rejects http URLs', () => {
    expect(() => assertWebhookUrlAllowed('http://example.com/hook')).toThrow(AppError);
  });

  it('rejects localhost targets', () => {
    expect(() => assertWebhookUrlAllowed('https://localhost/hook')).toThrow(AppError);
  });

  it('rejects private network targets', () => {
    expect(() => assertWebhookUrlAllowed('https://192.168.1.10/hook')).toThrow(AppError);
  });
});
