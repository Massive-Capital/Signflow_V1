import { pool } from '../database/db';

export interface ApplicationLogRow {
  id: string;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  device_type: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  duration_ms: number | null;
  user_id: string | null;
  organization_id: string | null;
  auth_type: string | null;
  created_at: Date;
}

export interface CreateApplicationLogInput {
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  deviceType?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  userId?: string;
  organizationId?: string;
  authType?: string;
}

export class ApplicationLogRepository {
  async create(input: CreateApplicationLogInput): Promise<ApplicationLogRow> {
    const result = await pool.query<ApplicationLogRow>(
      `INSERT INTO application_logs (
         level, message, metadata,
         ip_address, user_agent,
         browser_name, browser_version, os_name, os_version, device_type,
         method, path, status_code, duration_ms,
         user_id, organization_id, auth_type
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        input.level,
        input.message,
        input.metadata ? JSON.stringify(input.metadata) : null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
        input.browserName ?? null,
        input.browserVersion ?? null,
        input.osName ?? null,
        input.osVersion ?? null,
        input.deviceType ?? null,
        input.method ?? null,
        input.path ?? null,
        input.statusCode ?? null,
        input.durationMs ?? null,
        input.userId ?? null,
        input.organizationId ?? null,
        input.authType ?? null,
      ],
    );
    return result.rows[0];
  }
}

export const applicationLogRepository = new ApplicationLogRepository();
