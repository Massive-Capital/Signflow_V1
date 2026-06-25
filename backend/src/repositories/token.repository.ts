import { pool } from '../database/db';
import type { AuthTokenRow, TokenType } from '../types';

interface CreateTokenInput {
  userId: string;
  tokenHash: string;
  tokenType: TokenType;
  expiresAt: Date;
}

export class TokenRepository {
  async create(input: CreateTokenInput): Promise<AuthTokenRow> {
    const result = await pool.query<AuthTokenRow>(
      `INSERT INTO auth_tokens (user_id, token_hash, token_type, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.userId, input.tokenHash, input.tokenType, input.expiresAt],
    );
    return result.rows[0];
  }

  async findValidByHash(tokenHash: string, tokenType: TokenType): Promise<AuthTokenRow | null> {
    const result = await pool.query<AuthTokenRow>(
      `SELECT *
       FROM auth_tokens
       WHERE token_hash = $1
         AND token_type = $2
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash, tokenType],
    );
    return result.rows[0] ?? null;
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await pool.query(
      `UPDATE auth_tokens
       SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
  }

  async revokeAllForUser(userId: string, tokenType?: TokenType): Promise<void> {
    if (tokenType) {
      await pool.query(
        `UPDATE auth_tokens
         SET revoked_at = NOW()
         WHERE user_id = $1 AND token_type = $2 AND revoked_at IS NULL`,
        [userId, tokenType],
      );
      return;
    }

    await pool.query(
      `UPDATE auth_tokens
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  async deleteExpired(): Promise<void> {
    await pool.query('DELETE FROM auth_tokens WHERE expires_at <= NOW()');
  }
}

export const tokenRepository = new TokenRepository();
