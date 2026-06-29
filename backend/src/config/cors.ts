import type { CorsOptions } from 'cors';
import { env } from './env';

function isLocalDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

export function createCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (!env.isProduction && isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Machine-Ip'],
  };
}
