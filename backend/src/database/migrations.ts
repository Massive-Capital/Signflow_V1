import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { pool } from './db';

export async function verifyPoolConnection(): Promise<void> {
  await pool.query('SELECT 1');
}

export async function runMigrations(): Promise<void> {
  const migrationsDir = join(process.cwd(), 'migrations');
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.warn(`No migration files found in ${migrationsDir}`);
    return;
  }

  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), 'utf-8');
    await pool.query(sql);
    console.log(`Applied migration: ${file}`);
  }
}
