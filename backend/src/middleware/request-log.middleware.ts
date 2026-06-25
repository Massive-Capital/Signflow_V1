import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { logHttpRequest } from '../logging/logger';
import type { RequestWithAuth } from './user-context.middleware';
import { getClientIp } from '../utils/client-ip';
import { parseUserAgent } from '../utils/user-agent';

function shouldSkipPath(path: string): boolean {
  return env.logSkipPaths.some((skipPath) => path === skipPath || path.startsWith(`${skipPath}/`));
}

export function requestLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (shouldSkipPath(req.path)) {
    next();
    return;
  }

  const startedAt = Date.now();
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  const browser = parseUserAgent(userAgent);
  const ipAddress = getClientIp(req);

  res.on('finish', () => {
    const authReq = req as RequestWithAuth;
    const auth = authReq.auth;
    const durationMs = Date.now() - startedAt;
    const path = req.originalUrl || req.url;

    logHttpRequest(`${req.method} ${path} ${res.statusCode}`, {
      ipAddress,
      userAgent,
      browserName: browser.browserName,
      browserVersion: browser.browserVersion,
      osName: browser.osName,
      osVersion: browser.osVersion,
      deviceType: browser.deviceType,
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs,
      userId: auth?.userId,
      organizationId: auth?.organizationId,
      authType: auth?.authType,
    });
  });

  next();
}
