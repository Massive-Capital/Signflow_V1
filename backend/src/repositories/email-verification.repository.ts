import { pool } from '../database/db';

export interface EmailVerificationTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

interface CreateEmailVerificationInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export class EmailVerificationRepository {
  async create(input: CreateEmailVerificationInput): Promise<EmailVerificationTokenRow> {
    await pool.query(
      `UPDATE email_verification_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [input.userId],
    );

    const result = await pool.query<EmailVerificationTokenRow>(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.userId, input.tokenHash, input.expiresAt],
    );
    return result.rows[0];
  }

  async findValidByHash(tokenHash: string): Promise<EmailVerificationTokenRow | null> {
    const result = await pool.query<EmailVerificationTokenRow>(
      `SELECT *
       FROM email_verification_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async markUsed(tokenHash: string): Promise<void> {
    await pool.query(
      `UPDATE email_verification_tokens
       SET used_at = NOW()
       WHERE token_hash = $1`,
      [tokenHash],
    );
  }
}

export const emailVerificationRepository = new EmailVerificationRepository();
