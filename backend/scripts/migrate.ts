import { pool } from '../src/database/db';
import { runMigrations, verifyPoolConnection } from '../src/database/migrations';

async function migrate(): Promise<void> {
  await verifyPoolConnection();
  await runMigrations();
  console.log('Database migration completed successfully.');
}

migrate()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
