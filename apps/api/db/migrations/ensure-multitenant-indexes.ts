import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';
import mongoose from 'mongoose';

const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../../.env'),
  path.resolve(__dirname, '../../../../../itam.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI ?? process.env.DATABASE_URL;
  if (!uri) {
    throw new Error(
      'MONGODB_URI or DATABASE_URL must be configured in the API/workspace .env or the process environment',
    );
  }
  return uri;
}

function configureMongoDns(): void {
  const servers = (process.env.MONGODB_DNS_SERVERS ?? '1.1.1.1,8.8.8.8')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length > 0) dns.setServers(servers);
}

async function main() {
  const uri = getMongoUri();
  configureMongoDns();
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB database handle unavailable');

  const collectionName = 'asset_custom_field_values';
  const collections = await db
    .listCollections({ name: collectionName }, { nameOnly: true })
    .toArray();

  // A MongoDB collection does not exist until it has been created by the
  // application. Do not create a speculative collection just to run an index
  // migration: there is nothing to migrate if this collection is absent.
  if (collections.length === 0) {
    console.log(`Collection ${collectionName} does not exist; no index migration needed`);
    await mongoose.disconnect();
    return;
  }

  const collection = db.collection(collectionName);
  const indexes = await collection.listIndexes().toArray();

  const legacy = indexes.find(
    (index) => index.name === 'assetId_1' && index.unique === true,
  );

  if (legacy?.name) {
    await collection.dropIndex(legacy.name);
    console.log(`Dropped legacy index ${legacy.name}`);
  }

  const refreshed = await collection.listIndexes().toArray();
  const scoped = refreshed.find(
    (index) => index.name === 'tenantId_1_companyId_1_assetId_1',
  );

  if (!scoped) {
    await collection.createIndex(
      { tenantId: 1, companyId: 1, assetId: 1 },
      { unique: true, name: 'tenantId_1_companyId_1_assetId_1' },
    );
    console.log('Created tenant-scoped unique asset custom field index');
  } else {
    console.log('Tenant-scoped unique asset custom field index already exists');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
