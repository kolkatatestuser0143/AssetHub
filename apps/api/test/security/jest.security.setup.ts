import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';

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

// The local environment has previously been observed to expose 127.0.0.1
// as Node's resolver even when Windows itself has working DNS. Keep the
// security suite deterministic by using public resolvers for SRV/A lookups.
dns.setServers(
  (process.env.MONGODB_DNS_SERVERS ?? '1.1.1.1,8.8.8.8')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

function deriveDisposableMongoUri(uri: string): string {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]*)(\?.*)?$/i);
  if (!match) {
    throw new Error(
      'Security tests require MONGODB_TEST_URI, or a valid MONGODB_URI from which a disposable test database can be derived',
    );
  }

  const database = match[2];
  const suffix = match[3] ?? '';
  if (!database || database === 'admin' || database.endsWith('_test')) return uri;

  return `${match[1]}${database}_test${suffix}`;
}

const testUri = process.env.MONGODB_TEST_URI ?? process.env.MONGODB_URI;
if (!testUri) {
  throw new Error(
    'Security tests require MONGODB_TEST_URI or MONGODB_URI in apps/api/.env',
  );
}

process.env.MONGODB_URI = deriveDisposableMongoUri(testUri);

if (!process.env.REDIS_URL) {
  throw new Error(
    'Security tests require REDIS_URL in apps/api/.env or the process environment',
  );
}
