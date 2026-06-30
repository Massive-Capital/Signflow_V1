import { describe, expect, it } from 'vitest';
import { loginSchema } from '../src/validators/auth.validators';

describe('loginSchema', () => {
  it('requires passwords with at least 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
  });
});
