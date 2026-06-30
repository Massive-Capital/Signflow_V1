import { existsSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

const envLocalPath = resolve(process.cwd(), '.env.local');

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (process.env.NODE_ENV !== 'test') {
  throw new Error(
    'Missing backend/.env.local — copy .env.example to .env.local and configure your settings.',
  );
}
