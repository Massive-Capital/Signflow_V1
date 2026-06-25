import winston from 'winston';
import { env } from '../config/env';
import { PostgresTransport } from './postgres-transport';

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaKeys = Object.keys(meta).filter((key) => key !== 'timestamp' && key !== 'level');
    const suffix = metaKeys.length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${suffix}`;
  }),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

if (env.applicationLogDbEnabled) {
  transports.push(
    new PostgresTransport({
      level: env.applicationLogDbLevel,
    }),
  );
}

export const logger = winston.createLogger({
  level: env.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
  ),
  transports,
});

export interface RequestLogContext {
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
  metadata?: Record<string, unknown>;
}

export function logHttpRequest(message: string, context: RequestLogContext): void {
  logger.info(message, {
    logType: 'http',
    ...context,
  });
}

export function logApplicationEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: RequestLogContext = {},
): void {
  logger.log(level, message, {
    logType: 'application',
    ...context,
  });
}
