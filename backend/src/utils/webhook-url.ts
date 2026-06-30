import { AppError } from './app-error';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(normalized)) return true;
  if (normalized.endsWith('.local')) return true;
  if (isPrivateIpv4(normalized)) return true;
  return false;
}

export function assertWebhookUrlAllowed(rawUrl: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError('Webhook URL must be a valid HTTPS URL', 400, 'VALIDATION_ERROR');
  }

  if (parsed.protocol !== 'https:') {
    throw new AppError('Webhook URL must use HTTPS', 400, 'VALIDATION_ERROR');
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new AppError('Webhook URL cannot target private or local addresses', 400, 'VALIDATION_ERROR');
  }

  return parsed;
}
