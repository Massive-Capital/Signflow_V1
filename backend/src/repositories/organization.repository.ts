import { pool } from '../database/db';
import type { OrganizationRow } from '../types';

interface UpdateOrganizationInput {
  name?: string;
  plan?: string;
  logoUrl?: string;
  primaryColor?: string;
  buttonColor?: string;
}

export class OrganizationRepository {
  async create(name: string, plan = 'starter'): Promise<OrganizationRow> {
    const result = await pool.query<OrganizationRow>(
      `INSERT INTO organizations (name, plan)
       VALUES ($1, $2)
       RETURNING *`,
      [name, plan],
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<(OrganizationRow & {
    logo_url: string | null;
    primary_color: string | null;
    button_color: string | null;
  }) | null> {
    const result = await pool.query(
      'SELECT * FROM organizations WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByUserId(userId: string): Promise<(OrganizationRow & {
    logo_url: string | null;
    primary_color: string | null;
    button_color: string | null;
  })[]> {
    const result = await pool.query(
      `SELECT o.*
       FROM organizations o
       INNER JOIN users u ON u.organization_id = o.id
       WHERE u.id = $1`,
      [userId],
    );
    return result.rows;
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<void> {
    await pool.query(
      `UPDATE organizations
       SET name = COALESCE($1, name),
           plan = COALESCE($2, plan),
           logo_url = COALESCE($3, logo_url),
           primary_color = COALESCE($4, primary_color),
           button_color = COALESCE($5, button_color),
           updated_at = NOW()
       WHERE id = $6`,
      [input.name, input.plan, input.logoUrl, input.primaryColor, input.buttonColor, id],
    );
  }
}

export const organizationRepository = new OrganizationRepository();
