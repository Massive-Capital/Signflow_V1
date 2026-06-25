import { pool } from '../database/db';
import type { ApiKeyRow } from '../utils/mappers';

interface CreateApiKeyInput {
  organizationId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  environment: 'production' | 'sandbox';
  permissions: string[];
}

export class ApiKeyRepository {
  async listByOrganization(organizationId: string): Promise<ApiKeyRow[]> {
    const result = await pool.query<ApiKeyRow>(
      `SELECT * FROM api_keys WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId],
    );
    return result.rows;
  }

  async create(input: CreateApiKeyInput): Promise<ApiKeyRow> {
    const result = await pool.query<ApiKeyRow>(
      `INSERT INTO api_keys (organization_id, name, key_hash, key_prefix, environment, permissions)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.organizationId,
        input.name,
        input.keyHash,
        input.keyPrefix,
        input.environment,
        input.permissions,
      ],
    );
    return result.rows[0];
  }

  async findByHash(keyHash: string): Promise<ApiKeyRow | null> {
    const result = await pool.query<ApiKeyRow>(
      `SELECT * FROM api_keys WHERE key_hash = $1`,
      [keyHash],
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<ApiKeyRow | null> {
    const result = await pool.query<ApiKeyRow>(
      `SELECT * FROM api_keys WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async updateLastUsed(id: string): Promise<void> {
    await pool.query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [id]);
  }
}

export const apiKeyRepository = new ApiKeyRepository();
