import Transport from 'winston-transport';
import {
  applicationLogRepository,
  type CreateApplicationLogInput,
} from '../repositories/application-log.repository';

interface PostgresTransportOptions extends Transport.TransportStreamOptions {
  silent?: boolean;
}

interface LogInfo extends CreateApplicationLogInput {
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

function extractMetadata(info: LogInfo): Record<string, unknown> | undefined {
  const reserved = new Set([
    'level',
    'message',
    'metadata',
    'ipAddress',
    'userAgent',
    'browserName',
    'browserVersion',
    'osName',
    'osVersion',
    'deviceType',
    'method',
    'path',
    'statusCode',
    'durationMs',
    'userId',
    'organizationId',
    'authType',
    'timestamp',
    'stack',
    'splat',
    'symbol',
  ]);

  const extra: Record<string, unknown> = { ...(info.metadata ?? {}) };

  for (const [key, value] of Object.entries(info)) {
    if (!reserved.has(key) && value !== undefined) {
      extra[key] = value;
    }
  }

  return Object.keys(extra).length > 0 ? extra : undefined;
}

export class PostgresTransport extends Transport {
  constructor(opts: PostgresTransportOptions = {}) {
    super(opts);
  }

  log(info: LogInfo, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    void applicationLogRepository
      .create({
        level: info.level,
        message: info.message,
        metadata: extractMetadata(info),
        ipAddress: info.ipAddress,
        userAgent: info.userAgent,
        browserName: info.browserName,
        browserVersion: info.browserVersion,
        osName: info.osName,
        osVersion: info.osVersion,
        deviceType: info.deviceType,
        method: info.method,
        path: info.path,
        statusCode: info.statusCode,
        durationMs: info.durationMs,
        userId: info.userId,
        organizationId: info.organizationId,
        authType: info.authType,
      })
      .catch((error) => {
        console.error('Failed to persist application log:', error);
      })
      .finally(() => {
        callback();
      });
  }
}
