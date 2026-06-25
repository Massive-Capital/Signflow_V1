import { pool } from '../database/db';

export interface SdkConfigRow {
  organization_id: string;
  allowed_domains: string[];
  callback_on_complete: string | null;
  callback_on_decline: string | null;
}

export class SdkConfigRepository {
  async findByOrganization(organizationId: string): Promise<SdkConfigRow | null> {
    const result = await pool.query<SdkConfigRow>(
      'SELECT * FROM sdk_configs WHERE organization_id = $1',
      [organizationId],
    );
    return result.rows[0] ?? null;
  }

  async upsert(
    organizationId: string,
    input: {
      allowedDomains?: string[];
      callbackOnComplete?: string;
      callbackOnDecline?: string;
    },
  ): Promise<SdkConfigRow> {
    const result = await pool.query<SdkConfigRow>(
      `INSERT INTO sdk_configs (organization_id, allowed_domains, callback_on_complete, callback_on_decline)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id)
       DO UPDATE SET
         allowed_domains = COALESCE($2, sdk_configs.allowed_domains),
         callback_on_complete = COALESCE($3, sdk_configs.callback_on_complete),
         callback_on_decline = COALESCE($4, sdk_configs.callback_on_decline),
         updated_at = NOW()
       RETURNING *`,
      [
        organizationId,
        input.allowedDomains ?? [],
        input.callbackOnComplete ?? null,
        input.callbackOnDecline ?? null,
      ],
    );
    return result.rows[0];
  }
}

export const sdkConfigRepository = new SdkConfigRepository();
