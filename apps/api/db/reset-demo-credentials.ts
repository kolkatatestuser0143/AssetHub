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

const TENANT_ADMIN_PERMISSIONS = ['asset:read','asset:write','asset:bulk_update','asset:delete','company:read','company:write','user:read','user:write','role:read','role:write','identity_provider:read','identity_provider:write','scim:manage','integration:read','integration:write','billing:read','billing:manage','audit:read'];
const SYSTEM_ADMIN_PERMISSIONS = ['platform:console:access','platform:overview:read','platform:tenants:read','platform:tenants:manage','platform:users:read','platform:users:manage','platform:roles:read','platform:roles:manage','platform:billing:read','platform:billing:manage','platform:audit:read','platform:health:read','platform:analytics:read','platform:settings:read','platform:settings:manage','platform:support:read','platform:support:manage'];

function getMongodbUri(): string { const uri = process.env.MONGODB_URI; if (!uri) throw new Error('Missing required environment variable: MONGODB_URI'); return uri; }

async function ensurePermissions(db: any, keys: string[], now: Date) {
  const permissions = db.collection('permissions');
  for (const key of keys) await permissions.updateOne({ key }, { $set: { key, updatedAt: now }, $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now } }, { upsert: true });
  const docs = await permissions.find({ key: { $in: keys } }).toArray();
  const byKey = new Map(docs.map((doc: any) => [String(doc.key), String(doc._id)]));
  for (const key of keys) if (!byKey.has(key)) throw new Error(`Required permission missing: ${key}`);
  return byKey;
}

async function resetTenantAccount(db: any, now: Date) {
  const users = db.collection('users'); const tenants = db.collection('tenants'); const companies = db.collection('companies'); const roles = db.collection('roles'); const sessions = db.collection('sessions');
  const tenant = await tenants.findOne({ slug: 'demo' }); if (!tenant?._id) throw new Error('Demo tenant not found. Run db:seed first.');
  const company = await companies.findOne({ tenantId: String(tenant._id), code: 'DEMO' }); if (!company?._id) throw new Error('Demo company not found. Run db:seed first.');
  const permissionByKey = await ensurePermissions(db, TENANT_ADMIN_PERMISSIONS, now);
  const permissionRefs = TENANT_ADMIN_PERMISSIONS.map((permissionKey) => ({ permissionId: permissionByKey.get(permissionKey), permissionKey }));
  const roleResult = await roles.findOneAndUpdate({ tenantId: String(tenant._id), name: 'Tenant Admin' }, { $set: { tenantId: String(tenant._id), companyId: String(company._id), name: 'Tenant Admin', isSystem: true, permissions: permissionRefs, updatedAt: now }, $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now } }, { upsert: true, returnDocument: 'after' });
  if (!roleResult?._id) throw new Error('Failed to repair Demo Tenant Admin role');
  const passwordHash = await argon2.hash(TENANT_PASSWORD, { type: argon2.argon2id });
  const user = await users.findOne({ email: TENANT_EMAIL, accountType: 'TENANT' }, { projection: { _id: 1 } });
  if (!user?._id) throw new Error(`Tenant Admin account not found: ${TENANT_EMAIL}. Run db:seed first.`);
  await users.updateOne({ _id: user._id }, { $set: { tenantId: String(tenant._id), companyId: String(company._id), roleIds: [String(roleResult._id)], passwordHash, forcePasswordReset: true, failedLoginAttempts: 0, isActive: true, backupCodesHash: [], mfaMethod: 'NONE', updatedAt: now }, $unset: { lockedUntil: '', accessTokenHash: '', accessTokenIssuedAt: '', accessTokenExpiresAt: '' }, $inc: { authVersion: 1 } });
  await tenants.updateOne({ _id: tenant._id }, { $set: { status: 'active', primaryUserId: String(user._id), primaryEmail: TENANT_EMAIL, updatedAt: now }, $unset: { suspendedAt: '', suspendedBy: '', suspensionReason: '' } });
  await sessions.updateMany({ userId: String(user._id), revokedAt: { $exists: false } }, { $set: { revokedAt: now, revokedReason: 'demo_credentials_reset' } });
}

async function resetSystemAccount(db: any, now: Date) {
  const users = db.collection('users'); const roles = db.collection('roles'); const sessions = db.collection('sessions');
  const permissionByKey = await ensurePermissions(db, SYSTEM_ADMIN_PERMISSIONS, now);
  const permissionRefs = SYSTEM_ADMIN_PERMISSIONS.map((permissionKey) => ({ permissionId: permissionByKey.get(permissionKey), permissionKey }));
  const roleResult = await roles.findOneAndUpdate({ name: 'Platform Admin' }, { $set: { name: 'Platform Admin', tenantId: '', companyId: null, isSystem: true, permissions: permissionRefs, updatedAt: now }, $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now } }, { upsert: true, returnDocument: 'after' });
  if (!roleResult?._id) throw new Error('Failed to repair Platform Admin role');
  const passwordHash = await argon2.hash(SYSTEM_PASSWORD, { type: argon2.argon2id });
  const user = await users.findOne({ email: SYSTEM_EMAIL, accountType: 'SYSTEM' }, { projection: { _id: 1 } });
  if (!user?._id) throw new Error(`System Admin account not found: ${SYSTEM_EMAIL}. Run db:seed first.`);
  await users.updateOne({ _id: user._id }, { $set: { accountType: 'SYSTEM', tenantId: '', companyId: '', roleIds: [String(roleResult._id)], passwordHash, forcePasswordReset: true, failedLoginAttempts: 0, isActive: true, backupCodesHash: [], mfaMethod: 'NONE', updatedAt: now }, $unset: { lockedUntil: '', accessTokenHash: '', accessTokenIssuedAt: '', accessTokenExpiresAt: '' }, $inc: { authVersion: 1 } });
  await sessions.updateMany({ userId: String(user._id), revokedAt: { $exists: false } }, { $set: { revokedAt: now, revokedReason: 'demo_credentials_reset' } });
}

async function main() {
  const connection = await mongoose.createConnection(getMongodbUri()).asPromise();
  try { const db = connection.db; if (!db) throw new Error('Mongo connection failed: native db handle is undefined'); const now = new Date(); await resetTenantAccount(db, now); await resetSystemAccount(db, now); console.log('Demo credentials and authorization state repaired.'); console.log(`Tenant: ${TENANT_EMAIL} / ${TENANT_PASSWORD}`); console.log(`System: ${SYSTEM_EMAIL} / ${SYSTEM_PASSWORD}`); console.log('Tenant Admin includes billing:read and company:read.'); } finally { await connection.close(); }
}
main().catch((error) => { console.error(error); process.exit(1); });
