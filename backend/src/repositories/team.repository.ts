import { pool } from '../database/db';
import type { UserRow } from '../types';

interface TeamInviteRow {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  status: string;
}

export class TeamRepository {
  async listMembers(organizationId: string): Promise<UserRow[]> {
    const result = await pool.query<UserRow>(
      `SELECT * FROM users WHERE organization_id = $1 ORDER BY created_at ASC`,
      [organizationId],
    );
    return result.rows;
  }

  async listInvites(organizationId: string): Promise<TeamInviteRow[]> {
    const result = await pool.query<TeamInviteRow>(
      `SELECT * FROM team_invites
       WHERE organization_id = $1 AND status = 'invited'
       ORDER BY created_at DESC`,
      [organizationId],
    );
    return result.rows;
  }
}

export const teamRepository = new TeamRepository();
