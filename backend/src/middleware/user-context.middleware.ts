import type { NextFunction, Response } from 'express';
import { apiKeyRepository } from '../repositories/api-key.repository';
import { billingRepository } from '../repositories/billing.repository';
import { userRepository } from '../repositories/user.repository';
import type { AuthContext } from '../types/domain';
import { hashToken } from '../utils/crypto';
import { getPermissionsForRole } from '../utils/permissions';
import { AppError } from '../utils/app-error';
import type { AuthenticatedRequest } from './auth.middleware';

export interface RequestWithAuth extends AuthenticatedRequest {
  auth?: AuthContext;
}

export async function loadAuthContext(
  req: RequestWithAuth,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.apiKeyPlain) {
      const keyRow = await apiKeyRepository.findByHash(hashToken(req.apiKeyPlain));
      if (!keyRow) {
        throw new AppError('Invalid API key', 401, 'UNAUTHORIZED');
      }

      await apiKeyRepository.updateLastUsed(keyRow.id);
      void billingRepository.incrementUsage(keyRow.organization_id, 'api_calls').catch(() => {});

      req.auth = {
        authType: 'api_key',
        apiKeyId: keyRow.id,
        organizationId: keyRow.organization_id,
        permissions: keyRow.permissions,
      };
      next();
      return;
    }

    if (!req.userId) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const user = await userRepository.findById(req.userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    req.auth = {
      authType: 'user',
      userId: user.id,
      organizationId: user.organization_id,
      role: user.role,
      permissions: getPermissionsForRole(user.role),
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireUserAuth(req: RequestWithAuth, _res: Response, next: NextFunction): void {
  if (req.auth?.authType === 'api_key') {
    next(new AppError('This endpoint requires user authentication', 403, 'FORBIDDEN'));
    return;
  }
  next();
}

export function requirePermission(permission: string) {
  return (req: RequestWithAuth, _res: Response, next: NextFunction): void => {
    if (!req.auth?.permissions.includes(permission)) {
      next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}
