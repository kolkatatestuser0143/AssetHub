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

async function resetTenantAccount(db: any) {
  const now = new Date();
  const users = db.collection('users');
  const tenants = db.collection('tenants');
  const companies = db.collection('companies');
  const roles = db.collection('roles');
  const sessions = db.collection('sessions');

  const tenant = await tenants.findOne({ slug: 'demo' });
  if (!tenant?._id) throw new Error('Demo tenant not found. Run db:seed first.');
  const company = await companies.findOne({ tenantId: String(tenant._id), code: 'DEMO' });
  if (!company?._id) throw new Error('Demo company not found. Run db:seed first.');
  const role = await roles.findOne({ tenantId: String(tenant._id), name: 'Tenant Admin', companyId: String(company._id) });
  if (!role?._id) throw new Error('Demo Tenant Admin role not found. Run db:seed first.');

  const user = await users.findOne({ email: TENANT_EMAIL, accountType: 'TENANT' });
  if (!user?._id) throw new Error(`Tenant Admin account not found: ${TENANT_EMAIL}. Run db:seed first.`);
  const passwordHash = await argon2.hash(TENANT_PASSWORD, { type: argon2.argon2id });

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        tenantId: String(tenant._id),
        companyId: String(company._id),
        roleIds: [String(role._id)],
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

  await tenants.updateOne(
    { _id: tenant._id },
    { $set: { status: 'active', primaryUserId: String(user._id), primaryEmail: TENANT_EMAIL, updatedAt: now }, $unset: { suspendedAt: '', suspendedBy: '', suspensionReason: '' } },
  );

  await sessions.updateMany(
    { userId: String(user._id), revokedAt: { $exists: false } },
    { $set: { revokedAt: now, revokedReason: 'demo_credentials_reset' } },
  );
}

async function resetSystemAccount(db: any) {
  const now = new Date();
  const users = db.collection('users');
  const roles = db.collection('roles');
  const sessions = db.collection('sessions');

  const role = await roles.findOne({ name: 'Platform Admin', 'permissions.permissionKey': 'platform:console:access' });
  if (!role?._id) throw new Error('Platform Admin role not found. Run db:seed first.');
  const user = await users.findOne({ email: SYSTEM_EMAIL, accountType: 'SYSTEM' });
  if (!user?._id) throw new Error(`System Admin account not found: ${SYSTEM_EMAIL}. Run db:seed first.`);
  const passwordHash = await argon2.hash(SYSTEM_PASSWORD, { type: argon2.argon2id });

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        accountType: 'SYSTEM',
        tenantId: '',
        companyId: '',
        roleIds: [String(role._id)],
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
}

async function main() {
  const connection = await mongoose.createConnection(getMongodbUri()).asPromise();
  try {
    const db = connection.db;
    if (!db) throw new Error('Mongo connection failed: native db handle is undefined');

    await resetTenantAccount(db);
    await resetSystemAccount(db);

    console.log('Demo credentials reset and authorization state repaired.');
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
