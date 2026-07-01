import { env } from '../config/env';
import { AppError } from './app-error';

function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';

  try {
    if (trimmed.includes('://')) {
      return new URL(trimmed).hostname.toLowerCase();
    }
  } catch {
    // fall through
  }

  return trimmed.replace(/\/+$/, '');
}

function hostMatchesAllowed(host: string, allowed: string): boolean {
  const normalizedHost = normalizeDomain(host);
  const normalizedAllowed = normalizeDomain(allowed);

  if (!normalizedHost || !normalizedAllowed) return false;
  if (normalizedHost === normalizedAllowed) return true;
  return normalizedHost.endsWith(`.${normalizedAllowed}`);
}

export function isOriginAllowed(origin: string, allowedDomains: string[]): boolean {
  if (!origin) return false;

  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }

  return allowedDomains.some((allowed) => hostMatchesAllowed(host, allowed));
}

export function assertEmbedOriginAllowed(
  parentOrigin: string | undefined,
  allowedDomains: string[],
): void {
  // Non-production: allow portal embeds from any host/port (local dev, LAN, tunnels).
  if (!env.isProduction) {
    return;
  }

  if (allowedDomains.length === 0) {
    throw new AppError(
      'Embed signing is not configured. Add allowed domains in SDK settings.',
      403,
      'EMBED_NOT_CONFIGURED',
    );
  }

  if (!parentOrigin) {
    throw new AppError('Embed parent origin is required', 403, 'EMBED_ORIGIN_REQUIRED');
  }

  if (!isOriginAllowed(parentOrigin, allowedDomains)) {
    throw new AppError('Embed origin is not allowed for this organization', 403, 'EMBED_ORIGIN_FORBIDDEN');
  }
}

export function readEmbedParentOrigin(req: {
  headers: Record<string, string | string[] | undefined>;
}): string | undefined {
  const header = req.headers['x-signflow-parent-origin'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }

  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer.trim()) {
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function isEmbedRequest(req: {
  headers: Record<string, string | string[] | undefined>;
}): boolean {
  return req.headers['x-signflow-embed'] === '1';
}
