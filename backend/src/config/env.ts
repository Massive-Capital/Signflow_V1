import './load-env';

function optionalInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const databaseUser = process.env.DATABASE_USER ?? 'postgres';
const databasePassword = process.env.DATABASE_PASSWORD ?? '';
const databaseHost = process.env.DATABASE_HOST ?? 'localhost';
const databasePort = optionalInt('DATABASE_PORT', 5432);
const databaseName = process.env.DATABASE_NAME ?? 'signflow_db';

function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseCsv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const env = {
  port: optionalInt('PORT', 5007),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    user: databaseUser,
    password: databasePassword,
    host: databaseHost,
    port: databasePort,
    name: databaseName,
  },
  databaseUrl: `postgresql://${databaseUser}:${databasePassword}@${databaseHost}:${databasePort}/${databaseName}`,
  accessTokenTtl: optionalInt('ACCESS_TOKEN_TTL', 900),
  refreshTokenTtl: optionalInt('REFRESH_TOKEN_TTL', 60 * 60 * 24 * 7),
  passwordResetTtl: optionalInt('PASSWORD_RESET_TTL', 3600),
  frontendUrl: process.env.FRONTEND_URL ?? process.env.BASE_URL ?? 'http://localhost:5177',
  corsOrigins: parseCorsOrigins(
    process.env.CORS_ORIGIN ?? process.env.BASE_URL ?? 'http://localhost:5177',
  ),
  isProduction: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  applicationLogDbEnabled: parseBoolean(process.env.APPLICATION_LOG_DB_ENABLED, true),
  applicationLogDbLevel: process.env.APPLICATION_LOG_DB_LEVEL ?? 'info',
  logSkipPaths: parseCsv(process.env.LOG_SKIP_PATHS ?? '/health,/api/v1/health'),
} as const;
