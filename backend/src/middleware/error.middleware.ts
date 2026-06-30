import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { logApplicationEvent } from '../logging/logger';
import { captureMonitoringException } from '../monitoring';
import { AppError } from '../utils/app-error';
import { getClientIp } from '../utils/client-ip';
import { parseUserAgent } from '../utils/user-agent';
import type { RequestWithAuth } from './user-context.middleware';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('Route not found', 404, 'NOT_FOUND'));
}

function buildErrorLogContext(req: Request) {
  const authReq = req as RequestWithAuth;
  const auth = authReq.auth;
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  const browser = parseUserAgent(userAgent);

  return {
    ipAddress: getClientIp(req),
    userAgent,
    browserName: browser.browserName,
    browserVersion: browser.browserVersion,
    osName: browser.osName,
    osVersion: browser.osVersion,
    deviceType: browser.deviceType,
    method: req.method,
    path: req.originalUrl || req.url,
    userId: auth?.userId,
    organizationId: auth?.organizationId,
    authType: auth?.authType,
  };
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const logContext = buildErrorLogContext(req);

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logApplicationEvent('error', error.message, {
        ...logContext,
        statusCode: error.statusCode,
        metadata: { code: error.code },
      });
    }

    res.status(error.statusCode).json({
      error: {
        message: error.message,
        code: error.code,
      },
    });
    return;
  }

  logApplicationEvent('error', 'Unhandled server error', {
    ...logContext,
    statusCode: 500,
    metadata: {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
  });

  captureMonitoringException(error, logContext);

  res.status(500).json({
    error: {
      message: env.isProduction ? 'Internal server error' : 'Unexpected server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
