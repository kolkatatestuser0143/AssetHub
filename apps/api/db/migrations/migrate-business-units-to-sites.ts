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
for (const envPath of envCandidates) if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI ?? process.env.DATABASE_URL;
  if (!uri) throw new Error('MONGODB_URI or DATABASE_URL must be configured');
  return uri;
}

function configureMongoDns(): void {
  const servers = (process.env.MONGODB_DNS_SERVERS ?? '1.1.1.1,8.8.8.8').split(',').map((x) => x.trim()).filter(Boolean);
  if (servers.length) dns.setServers(servers);
}

async function findLegacyBusinessUnits(db: mongoose.mongo.Db) {
  for (const name of ['businessunits', 'business_units', 'businessUnits']) {
    const exists = await db.listCollections({ name }, { nameOnly: true }).toArray();
    if (exists.length) return db.collection(name);
  }
  return null;
}

async function main() {
  configureMongoDns();
  await mongoose.connect(getMongoUri());
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB database handle unavailable');

  const plants = db.collection('plants');
  const legacyBusinessUnits = await findLegacyBusinessUnits(db);
  const legacyCount = legacyBusinessUnits ? await legacyBusinessUnits.countDocuments({}) : 0;
  console.log(`Legacy business-unit records found: ${legacyCount}`);

  let migrated = 0;
  let skipped = 0;

  const cursor = plants.find({ $or: [{ companyId: { $exists: false } }, { companyId: null }] });
  for await (const plant of cursor) {
    let companyId = plant.companyId;

    if (!companyId && legacyBusinessUnits && plant.businessUnitId) {
      const bu = await legacyBusinessUnits.findOne({ _id: plant.businessUnitId });
      companyId = bu?.companyId;
    }

    if (!companyId) {
      console.warn(`Skipping plant ${String(plant._id)} (${plant.name ?? 'unnamed'}): company could not be resolved`);
      skipped += 1;
      continue;
    }

    const type = ['plant', 'branch_office', 'head_office'].includes(plant.type) ? plant.type : 'plant';
    await plants.updateOne(
      { _id: plant._id },
      { $set: { companyId: String(companyId), type }, $unset: { businessUnitId: '' } },
    );
    migrated += 1;
  }

  const remainingLegacyLinks = await plants.countDocuments({ businessUnitId: { $exists: true } });
  console.log(`Migrated sites: ${migrated}`);
  console.log(`Skipped sites: ${skipped}`);
  console.log(`Remaining legacy businessUnitId links on plants: ${remainingLegacyLinks}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
