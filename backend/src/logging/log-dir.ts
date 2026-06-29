import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

function resolveBackendRoot(): string {
  // dist/logging or src/logging -> backend root
  return join(__dirname, '..', '..');
}

export function getLogDirectory(): string {
  const configured = process.env.LOG_DIR?.trim();
  if (configured) {
    return configured.startsWith('/') || /^[A-Za-z]:[\\/]/.test(configured)
      ? configured
      : join(resolveBackendRoot(), configured);
  }

  return join(resolveBackendRoot(), 'logs');
}

export function ensureLogDirectory(): string {
  const logDir = getLogDirectory();
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}
