import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    const tenants = connection.collection('tenants');
    const users = connection.collection('users');
    const cursor = tenants.find({ primaryUserId: { $exists: false } });
    let updated = 0;
    while (await cursor.hasNext()) {
      const tenant = await cursor.next();
      if (!tenant) continue;
      const primaryUser = await users.findOne({ tenantId: String(tenant._id), accountType: 'TENANT' }, { sort: { createdAt: 1, _id: 1 } });
      if (!primaryUser) continue;
      await tenants.updateOne(
        { _id: tenant._id, primaryUserId: { $exists: false } },
        { $set: { primaryUserId: String(primaryUser._id), primaryEmail: String(primaryUser.email).toLowerCase(), updatedAt: new Date() } },
      );
      updated += 1;
    }
    console.log(`Backfilled ${updated} tenant primary login identities.`);
  } finally {
    await connection.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
