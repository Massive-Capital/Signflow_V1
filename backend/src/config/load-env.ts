import { existsSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

const envLocalPath = resolve(process.cwd(), '.env.local');

if (!existsSync(envLocalPath)) {
  throw new Error(
    'Missing backend/.env.local — copy .env.example to .env.local and configure your settings.',
  );
}

dotenv.config({ path: envLocalPath });
