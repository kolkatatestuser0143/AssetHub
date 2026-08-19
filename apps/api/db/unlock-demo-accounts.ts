import '../src/bootstrap-dns';
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: require('path').resolve(__dirname, '../../../.env') });

import mongoose from 'mongoose';

const DEMO_ACCOUNTS = [
  { email: process.env.TENANT_ADMIN_EMAIL ?? 'admin@demo.local', label: 'Tenant Admin' },
  { email: process.env.SYSTEM_ADMIN_EMAIL ?? 'admin@assethub.local', label: 'System Admin' },
];

function getMongodbUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing required environment variable: MONGODB_URI');
  return uri;
}

async function main() {
  const connection = await mongoose.createConnection(getMongodbUri()).asPromise();
  try {
    const db = connection.db;
    if (!db) throw new Error('Mongo connection failed: native db handle is undefined');

    const users = db.collection('users');
    const sessions = db.collection('sessions');
    const now = new Date();

    for (const account of DEMO_ACCOUNTS) {
      const user = await users.findOne({ email: account.email }, { projection: { _id: 1, email: 1, accountType: 1 } });
      if (!user?._id) {
        console.log(`${account.label}: ${account.email} not found; nothing to unlock.`);
        continue;
      }

      await users.updateOne(
        { _id: user._id },
        {
          $set: { failedLoginAttempts: 0, updatedAt: now },
          $unset: { lockedUntil: '' },
        },
      );

      await sessions.updateMany(
        { userId: String(user._id), revokedAt: { $exists: false } },
        { $set: { revokedAt: now, revokedReason: 'demo_account_unlock' } },
      );

      console.log(`${account.label}: ${account.email} unlocked; active sessions revoked.`);
    }
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
