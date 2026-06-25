import { createHash, randomBytes } from 'crypto';
import { AppError } from './app-error';

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashBuffer(data: Buffer | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export function assertBufferHash(
  data: Buffer | Uint8Array,
  expectedHash: string | null | undefined,
  label = 'File',
): void {
  if (!expectedHash) return;

  const actualHash = hashBuffer(data);
  if (actualHash !== expectedHash) {
    throw new AppError(`${label} integrity check failed`, 500, 'INTEGRITY_ERROR');
  }
}
