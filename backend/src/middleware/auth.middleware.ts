import type { NextFunction, Request, Response } from 'express';
import { tokenService } from '../services/token.service';
import { AppError } from '../utils/app-error';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  apiKeyPlain?: string;
}

function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authorizationHeader.slice(7).trim() || null;
}

export function isApiKeyToken(token: string): boolean {
  return token.startsWith('pk_live_') || token.startsWith('pk_test_');
}

function extractCredentials(req: Request): { type: 'api_key' | 'jwt'; token: string } | null {
  const headerApiKey = req.headers['x-api-key'];
  if (typeof headerApiKey === 'string' && headerApiKey.trim()) {
    return { type: 'api_key', token: headerApiKey.trim() };
  }

  const bearer = extractBearerToken(req.headers.authorization);
  if (!bearer) {
    return null;
  }

  if (isApiKeyToken(bearer)) {
    return { type: 'api_key', token: bearer };
  }

  return { type: 'jwt', token: bearer };
}

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const credentials = extractCredentials(req);
    if (!credentials) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    if (credentials.type === 'api_key') {
      req.apiKeyPlain = credentials.token;
      next();
      return;
    }

    req.userId = await tokenService.validateAccessToken(credentials.token);
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuthenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const credentials = extractCredentials(req);
  if (!credentials) {
    next();
    return;
  }

  if (credentials.type === 'api_key') {
    req.apiKeyPlain = credentials.token;
    next();
    return;
  }

  tokenService
    .validateAccessToken(credentials.token)
    .then((userId) => {
      req.userId = userId;
      next();
    })
    .catch(() => next());
}
