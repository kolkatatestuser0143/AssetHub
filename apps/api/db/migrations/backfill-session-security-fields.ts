import 'dotenv/config';
import crypto from 'crypto';
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    const sessions = connection.collection('sessions');
    const cursor = sessions.find({ $or: [{ familyId: { $exists: false } }, { familyId: null }] });
    let updated = 0;
    while (await cursor.hasNext()) {
      const session = await cursor.next();
      if (!session) continue;
      const familyId = String(session.familyId ?? '').trim() || crypto.randomUUID();
      const result = await sessions.updateOne(
        { _id: session._id, $or: [{ familyId: { $exists: false } }, { familyId: null }] },
        { $set: { familyId } },
      );
      if (result.modifiedCount > 0) updated += 1;
    }
    console.log(`Backfilled ${updated} session family identifiers.`);
  } finally {
    await connection.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
