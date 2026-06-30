import { describe, expect, it, vi } from 'vitest';
import { clearAuthCookies, setAuthCookies } from '../src/utils/auth-cookies';

describe('auth cookies', () => {
  it('sets httpOnly access and refresh cookies', () => {
    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    };

    setAuthCookies(res as never, 'access-token', 'refresh-token');

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.cookie.mock.calls[0]?.[0]).toBe('sf_access');
    expect(res.cookie.mock.calls[0]?.[1]).toBe('access-token');
    expect(res.cookie.mock.calls[0]?.[2]).toMatchObject({ httpOnly: true });
  });

  it('clears auth cookies on logout', () => {
    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    };

    clearAuthCookies(res as never);
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });
});
