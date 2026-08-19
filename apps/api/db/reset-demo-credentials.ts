import '../src/bootstrap-dns';
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: require('path').resolve(__dirname, '../../../.env') });

import mongoose from 'mongoose';
import * as argon2 from 'argon2';

const TENANT_EMAIL = process.env.TENANT_ADMIN_EMAIL ?? 'admin@demo.local';
const TENANT_PASSWORD = 'ChangeMe1234567!';
const SYSTEM_EMAIL = process.env.SYSTEM_ADMIN_EMAIL ?? 'admin@assethub.local';
const SYSTEM_PASSWORD = 'ChangeMe1234567!';

function getMongodbUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing required environment variable: MONGODB_URI');
  return uri;
}

async function resetAccount(users: any, sessions: any, email: string, password: string, label: string) {
  const now = new Date();
  const user = await users.findOne({ email }, { projection: { _id: 1, accountType: 1, authVersion: 1 } });
  if (!user?._id) throw new Error(`${label} account not found: ${email}`);

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash,
        forcePasswordReset: true,
        failedLoginAttempts: 0,
        isActive: true,
        backupCodesHash: [],
        mfaMethod: 'NONE',
        authVersion: Number(user.authVersion ?? 0) + 1,
        updatedAt: now,
      },
      $unset: { lockedUntil: '', accessTokenHash: '', accessTokenIssuedAt: '', accessTokenExpiresAt: '' },
    },
  );

  await sessions.updateMany(
    { userId: String(user._id), revokedAt: { $exists: false } },
    { $set: { revokedAt: now, revokedReason: 'demo_credentials_reset' } },
  );

  console.log(`${label} reset: ${email}`);
}

async function main() {
  const connection = await mongoose.createConnection(getMongodbUri()).asPromise();
  try {
    const db = connection.db;
    if (!db) throw new Error('Mongo connection failed: native db handle is undefined');
    const users = db.collection('users');
    const sessions = db.collection('sessions');

    await resetAccount(users, sessions, TENANT_EMAIL, TENANT_PASSWORD, 'Tenant Admin');
    await resetAccount(users, sessions, SYSTEM_EMAIL, SYSTEM_PASSWORD, 'System Admin');

    console.log('Demo credentials reset and accounts unlocked.');
    console.log(`Tenant: ${TENANT_EMAIL} / ${TENANT_PASSWORD}`);
    console.log(`System: ${SYSTEM_EMAIL} / ${SYSTEM_PASSWORD}`);
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
