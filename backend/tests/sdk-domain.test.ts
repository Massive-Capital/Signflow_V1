import { describe, expect, it } from 'vitest';
import { isOriginAllowed } from '../src/utils/sdk-domain';

describe('isOriginAllowed', () => {
  it('matches exact hostnames', () => {
    expect(isOriginAllowed('https://app.customer.com', ['customer.com'])).toBe(true);
  });

  it('matches subdomain hosts', () => {
    expect(isOriginAllowed('https://portal.customer.com', ['customer.com'])).toBe(true);
  });

  it('rejects unrelated hosts', () => {
    expect(isOriginAllowed('https://evil.example.com', ['customer.com'])).toBe(false);
  });
});
