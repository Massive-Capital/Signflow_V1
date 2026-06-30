import type { Request } from 'express';

export const MACHINE_IP_HEADER = 'x-client-machine-ip';

function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  return ip;
}

function readHeaderValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.split(',')[0]?.trim();
  }

  if (Array.isArray(value) && value[0]?.trim()) {
    return value[0].trim();
  }

  return undefined;
}

function isLoopbackIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  return normalized.startsWith('127.') || normalized === '::1';
}

function isRecordableClientIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized || normalized === '0.0.0.0') return false;
  if (isLoopbackIp(normalized)) return false;
  if (normalized.includes('.local')) return false;
  return true;
}

function getConnectionIp(req: Request): string | undefined {
  const candidates = [
    req.ip,
    readHeaderValue(req.headers['x-forwarded-for'])?.split(',')[0]?.trim(),
    readHeaderValue(req.headers['x-real-ip']),
    req.socket?.remoteAddress,
  ];

  for (const candidate of candidates) {
    if (candidate && isRecordableClientIp(candidate)) {
      return normalizeIp(candidate);
    }
  }

  return undefined;
}

/**
 * Prefer the browser-reported machine IP (LAN when available).
 * Fall back to the connection IP seen by the server when discovery fails.
 */
export function getClientIp(req: Request): string | undefined {
  const machineIp = readHeaderValue(req.headers[MACHINE_IP_HEADER]);
  if (machineIp && isRecordableClientIp(machineIp)) {
    return normalizeIp(machineIp);
  }

  return getConnectionIp(req);
}
