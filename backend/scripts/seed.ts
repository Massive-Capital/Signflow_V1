import { pool } from '../src/database/db';
import { hashPassword } from '../src/utils/password';
import { hashToken } from '../src/utils/crypto';

const ADMIN_EMAIL = 'admin@work.com';
const ADMIN_PASSWORD = '12345678';
const DEMO_SIGNING_TOKEN = 'abcdef123';

async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let organizationId: string;
    const existingUser = await client.query('SELECT organization_id FROM users WHERE email = $1', [
      ADMIN_EMAIL,
    ]);

    if (existingUser.rows.length > 0) {
      organizationId = existingUser.rows[0].organization_id as string;
      console.log(`User ${ADMIN_EMAIL} already exists — seeding demo data.`);
    } else {
      const passwordHash = await hashPassword(ADMIN_PASSWORD);
      const orgResult = await client.query(
        `INSERT INTO organizations (name, plan, primary_color)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['Admin Workspace', 'enterprise', '#2563eb'],
      );
      organizationId = orgResult.rows[0].id as string;

      await client.query(
        `INSERT INTO users (email, password_hash, name, role, organization_id, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [ADMIN_EMAIL, passwordHash, 'Admin', 'owner', organizationId, true],
      );
      console.log(`Seeded admin user: ${ADMIN_EMAIL}`);
    }

    const existingDocs = await client.query(
      'SELECT id FROM documents WHERE organization_id = $1 LIMIT 1',
      [organizationId],
    );
    if (existingDocs.rows.length > 0) {
      console.log('Demo documents already exist — skipping demo data.');
      await client.query('COMMIT');
      return;
    }

    await client.query(
      `INSERT INTO usage_metrics (organization_id, api_calls, embedded_sessions, documents_signed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id) DO UPDATE
       SET api_calls = $2, embedded_sessions = $3, documents_signed = $4, updated_at = NOW()`,
      [organizationId, 12450, 892, 186],
    );

    const docResult = await client.query(
      `INSERT INTO documents (organization_id, title, status, pages)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [organizationId, 'NDA - TechNova Partnership', 'pending', 3],
    );
    const documentId = docResult.rows[0].id as string;

    const rec1 = await client.query(
      `INSERT INTO document_recipients (document_id, name, email, role, color, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [documentId, 'Jane Investor', 'jane@investor.com', 'buyer', '#dc2626', 1],
    );
    const rec2 = await client.query(
      `INSERT INTO document_recipients (document_id, name, email, role, color, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [documentId, 'John Sponsor', 'john@sponsor.com', 'seller', '#2563eb', 2],
    );
    const recipient1Id = rec1.rows[0].id as string;
    const recipient2Id = rec2.rows[0].id as string;

    await client.query(
      `INSERT INTO document_fields
       (document_id, recipient_id, type, label, x, y, width, height, page, required)
       VALUES
       ($1, $2, 'signature', 'Buyer Signature', 10, 70, 30, 8, 1, TRUE),
       ($1, $3, 'signature', 'Seller Signature', 55, 70, 30, 8, 1, TRUE)`,
      [documentId, recipient1Id, recipient2Id],
    );

    await client.query(
      `INSERT INTO signing_sessions (token_hash, document_id, recipient_id, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')`,
      [hashToken(DEMO_SIGNING_TOKEN), documentId, recipient1Id],
    );

    await client.query(
      `INSERT INTO documents (organization_id, title, status, pages) VALUES
       ($1, 'Employment Agreement - Q2 Hire', 'completed', 5),
       ($1, 'Vendor Service Agreement', 'draft', 2)`,
      [organizationId],
    );

    await client.query(
      `INSERT INTO invoices (organization_id, invoice_date, amount, status) VALUES
       ($1, '2026-06-01', 299, 'paid'),
       ($1, '2026-05-01', 299, 'paid'),
       ($1, '2026-04-01', 299, 'paid')`,
      [organizationId],
    );

    await client.query(
      `INSERT INTO team_invites (organization_id, email, role) VALUES ($1, $2, $3)`,
      [organizationId, 'new@acme.com', 'member'],
    );

    await client.query('COMMIT');
    console.log('Demo data seeded successfully.');
    console.log(`Demo signing URL: /sign/${DEMO_SIGNING_TOKEN}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
