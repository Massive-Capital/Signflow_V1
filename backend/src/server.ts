import { createApp } from './app';
import { runMigrations, verifyPoolConnection } from './database/migrations';
import { env } from './config/env';
import { logger } from './logging/logger';

async function initDatabaseAfterListen(): Promise<void> {
  try {
    await verifyPoolConnection();
    if (process.env.SKIP_DB_MIGRATIONS === '1') {
      logger.warn('SKIP_DB_MIGRATIONS=1 — migrations were not applied.');
    } else {
      await runMigrations();
      logger.info('Database migrations applied successfully.');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Database initialization failed', {
      metadata: {
        message,
        hint: 'Fix DATABASE_* in backend/.env.local, ensure PostgreSQL is running, then restart.',
      },
    });
    if (process.env.REQUIRE_DB_BEFORE_START === '1') {
      process.exit(1);
    }
  }
}

async function startServer(): Promise<void> {
  const app = createApp();

  app.listen(env.port, () => {
    logger.info(`SignFlow API listening on http://localhost:${env.port}/api/v1`);
    void initDatabaseAfterListen();
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server', {
    metadata: {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
  });
  process.exit(1);
});
