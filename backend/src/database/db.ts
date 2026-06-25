import '../config/load-env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema/schema';

const DATABASE_USER = process.env.DATABASE_USER ?? 'postgres';
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD ?? '';
const DATABASE_HOST = process.env.DATABASE_HOST ?? 'localhost';
const DATABASE_PORT = process.env.DATABASE_PORT ?? '5432';
const DATABASE_NAME = process.env.DATABASE_NAME ?? 'signflow_db';

const DATABASE_URI = `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`;

const pool = new Pool({
  connectionString: DATABASE_URI,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

export const db = drizzle({ client: pool, schema });
export { pool };
