import type { UserRole } from '../types';
import { AppError } from './app-error';

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ['documents:read', 'documents:write', 'teams:manage', 'billing:view', 'api:manage'],
  admin: ['documents:read', 'documents:write', 'teams:manage', 'billing:view', 'api:manage'],
  member: ['documents:read', 'documents:write'],
};

export function getPermissionsForRole(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function requirePermission(permissions: string[], required: string): void {
  if (!permissions.includes(required)) {
    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }
}

export function formatDisplayRole(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
  };
  return labels[role] ?? role;
}
