import { pool } from '../database/db';
import type { PasswordResetTokenRow } from '../types';

interface CreatePasswordResetInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export class PasswordResetRepository {
  async create(input: CreatePasswordResetInput): Promise<PasswordResetTokenRow> {
    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [input.userId],
    );

    const result = await pool.query<PasswordResetTokenRow>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.userId, input.tokenHash, input.expiresAt],
    );
    return result.rows[0];
  }

  async findValidByHash(tokenHash: string): Promise<PasswordResetTokenRow | null> {
    const result = await pool.query<PasswordResetTokenRow>(
      `SELECT *
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async markUsed(tokenHash: string): Promise<void> {
    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1`,
      [tokenHash],
    );
  }
}

export const passwordResetRepository = new PasswordResetRepository();
