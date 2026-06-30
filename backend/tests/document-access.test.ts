import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './app.test-app';

describe('document file access', () => {
  it('does not expose unauthenticated static document files', async () => {
    const response = await request(app).get(
      '/api/v1/files/documents/00000000-0000-0000-0000-000000000001.pdf',
    );
    expect(response.status).toBe(404);
  });
});
