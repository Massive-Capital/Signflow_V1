import { pool } from '../database/db';
import type { UserRole, UserRow } from '../types';

interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
  organizationId: string;
  role?: UserRole;
}

export class UserRepository {
  async create(input: CreateUserInput): Promise<UserRow> {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, name, organization_id, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.email.toLowerCase(),
        input.passwordHash,
        input.name,
        input.organizationId,
        input.role ?? 'owner',
      ],
    );
    return result.rows[0];
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await pool.query<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()],
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const result = await pool.query<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await pool.query(
      `UPDATE users
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, userId],
    );
  }

  async markEmailVerified(userId: string): Promise<void> {
    await pool.query(
      `UPDATE users
       SET email_verified = TRUE, updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );
  }
}

export const userRepository = new UserRepository();
