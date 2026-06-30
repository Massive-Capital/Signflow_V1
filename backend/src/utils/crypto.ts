import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { AppError } from './app-error';

const ENCRYPTION_PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer {
  const secret = process.env.APP_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('APP_SECRET must be set to at least 32 characters in backend/.env.local');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(ciphertext: string): string {
  if (!ciphertext.startsWith(ENCRYPTION_PREFIX)) {
    throw new AppError('Webhook secret is not available for signing', 500, 'WEBHOOK_SECRET_UNAVAILABLE');
  }

  const payload = ciphertext.slice(ENCRYPTION_PREFIX.length);
  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (!ivPart || !tagPart || !dataPart) {
    throw new AppError('Webhook secret is corrupted', 500, 'WEBHOOK_SECRET_UNAVAILABLE');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

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
