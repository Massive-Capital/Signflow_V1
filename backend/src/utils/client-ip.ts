import type { Request } from 'express';

export const MACHINE_IP_HEADER = 'x-client-machine-ip';

const PRIVATE_IPV4_RANGES = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
];

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

function isPrivateIpv4(ip: string): boolean {
  return PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(ip));
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  );
}

function isClientMachineIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized || normalized === '0.0.0.0') return false;
  if (normalized.startsWith('127.') || normalized === '::1') return false;
  return isPrivateIpv4(normalized) || isPrivateIpv6(normalized);
}

/**
 * Return only the browser-reported local machine IP (LAN).
 * Never fall back to server, proxy, or public network IPs.
 */
export function getClientIp(req: Request): string | undefined {
  const machineIp = readHeaderValue(req.headers[MACHINE_IP_HEADER]);
  if (machineIp && isClientMachineIp(machineIp)) {
    return normalizeIp(machineIp);
  }

  return undefined;
}
