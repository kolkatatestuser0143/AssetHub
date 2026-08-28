import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const candidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

function deriveDisposablePostgresUri(uri: string): string {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('Security tests require a valid PostgreSQL DATABASE_URL');
  }
  const database = parsed.pathname.replace(/^\//, '');
  if (!database || database === 'postgres' || database === 'template1') {
    throw new Error('Security tests require a dedicated PostgreSQL test database, not the default database');
  }
  if (!database.endsWith('_test')) {
    parsed.pathname = `/${database}_test`;
  }
  return parsed.toString();
}

const sourceUrl = process.env.DATABASE_TEST_URL ?? process.env.DATABASE_URL;
if (!sourceUrl) {
  throw new Error('Security tests require DATABASE_TEST_URL or DATABASE_URL in apps/api/.env');
}

process.env.DATABASE_URL = deriveDisposablePostgresUri(sourceUrl);
if (process.env.DIRECT_URL) process.env.DIRECT_URL = deriveDisposablePostgresUri(process.env.DIRECT_URL);

if (!process.env.REDIS_URL) {
  throw new Error('Security tests require REDIS_URL in apps/api/.env or the process environment');
}
