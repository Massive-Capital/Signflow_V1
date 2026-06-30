import { logger } from '../logging/logger';
import { env } from '../config/env';

export function initMonitoring(): void {
  const sentryDsn = process.env.SENTRY_DSN?.trim();
  if (!sentryDsn) {
    if (env.isProduction) {
      logger.warn('SENTRY_DSN is not set — production errors are logged locally only.');
    }
    return;
  }

  logger.info('Monitoring hook ready (set SENTRY_DSN to enable external error reporting).', {
    metadata: { provider: 'sentry', configured: true },
  });
}

export function captureMonitoringException(error: unknown, context?: Record<string, unknown>): void {
  logger.error('Captured application exception', {
    metadata: {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    },
  });
}
