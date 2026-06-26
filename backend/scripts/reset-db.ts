import { pool } from '../src/database/db';
import { hashPassword } from '../src/utils/password';

const ADMIN_EMAIL = 'admin@work.com';
const ADMIN_PASSWORD = '12345678';

async function resetDb(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      TRUNCATE TABLE
        application_logs,
        password_reset_tokens,
        auth_tokens,
        signing_sessions,
        document_fields,
        document_recipients,
        documents,
        api_keys,
        webhooks,
        invoices,
        usage_metrics,
        team_invites,
        sdk_configs,
        users,
        organizations
      RESTART IDENTITY CASCADE
    `);

    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const orgResult = await client.query(
      `INSERT INTO organizations (name, plan, primary_color)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['Admin Workspace', 'enterprise', '#2563eb'],
    );
    const organizationId = orgResult.rows[0].id as string;

    await client.query(
      `INSERT INTO users (email, password_hash, name, role, organization_id, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ADMIN_EMAIL, passwordHash, 'Admin', 'owner', organizationId, true],
    );

    await client.query('COMMIT');
    console.log('Database reset complete.');
    console.log(`Admin user: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

resetDb()
  .catch((error) => {
    console.error('Reset failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
