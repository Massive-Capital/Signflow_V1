import type { Request } from 'express';

function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  return ip;
}

export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return normalizeIp(first);
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return normalizeIp(forwarded[0].trim());
  }

  const ip = req.socket?.remoteAddress ?? req.ip;
  if (ip) return normalizeIp(ip);

  return undefined;
}
