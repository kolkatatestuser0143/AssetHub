import 'dotenv/config';
import mongoose from 'mongoose';

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI ?? process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('MONGODB_URI or DATABASE_URL must be configured');
  }
  return uri;
}

async function main() {
  const uri = getMongoUri();
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB database handle unavailable');

  const collection = db.collection('asset_custom_field_values');
  const indexes = await collection.listIndexes().toArray();

  // Older versions created a globally unique assetId index. That is not
  // valid for a multi-tenant database and conflicts with the scoped index.
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
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
