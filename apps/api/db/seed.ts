import '../src/bootstrap-dns';
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: require('path').resolve(__dirname, '../../../.env') });
import mongoose from 'mongoose';
import * as argon2 from 'argon2';
import { UserAccountType } from '../src/models/user.schemas';

function getMongodbUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing required environment variable: MONGODB_URI');
  return uri;
}

const PERMISSIONS = ['asset:read','asset:write','asset:bulk_update','asset:delete','company:read','company:write','user:read','user:write','role:read','role:write','identity_provider:read','identity_provider:write','scim:manage','integration:read','integration:write','billing:read','billing:manage','audit:read','platform:manage_tenants'];
const SYSTEM_ROLES: Record<string, string[]> = {
  'Tenant Admin': PERMISSIONS.filter((p) => !p.startsWith('platform:')),
  'Company Admin': ['asset:read','asset:write','asset:bulk_update','company:read','user:read','user:write','role:read','identity_provider:read','audit:read'],
  'IT Manager': ['asset:read','asset:write','asset:bulk_update','user:read'],
  'Read-Only Auditor': ['asset:read','company:read','user:read','audit:read'],
  'Platform Admin': ['platform:manage_tenants'],
};

async function main() {
  const connection = await mongoose.createConnection(getMongodbUri()).asPromise();
  try {
    const db = connection.db;
    if (!db) throw new Error('Mongo connection failed: native db handle is undefined');
    const tenants = db.collection('tenants'); const companies = db.collection('companies'); const permissions = db.collection('permissions'); const roles = db.collection('roles'); const users = db.collection('users'); const now = new Date();
    await users.updateMany({ accountType: { $exists: false } }, { $set: { accountType: UserAccountType.TENANT } });
    for (const key of PERMISSIONS) await permissions.updateOne({ key }, { $setOnInsert: { key, _id: new mongoose.Types.ObjectId(), createdAt: now, updatedAt: now } }, { upsert: true });
    const permDocs = await permissions.find({}).toArray(); const permByKey = new Map(permDocs.map((p) => [p.key as string, String(p._id)]));
    let tenantDoc = await tenants.findOne({ slug: 'demo' }); const tenantId = tenantDoc ? tenantDoc._id as mongoose.Types.ObjectId : new mongoose.Types.ObjectId();
    if (!tenantDoc) await tenants.insertOne({ _id: tenantId, name: 'Demo Tenant', slug: 'demo', createdAt: now, updatedAt: now });
    let companyDoc = await companies.findOne({ tenantId, code: 'DEMO' }); const companyId = companyDoc ? companyDoc._id as mongoose.Types.ObjectId : new mongoose.Types.ObjectId();
    if (!companyDoc) await companies.insertOne({ _id: companyId, tenantId, name: 'Demo Company', code: 'DEMO', createdAt: now, updatedAt: now });
    const roleRefs: Record<string, string> = {};
    for (const [roleName, perms] of Object.entries(SYSTEM_ROLES)) {
      const permRefs = perms.map((key) => ({ permissionId: permByKey.get(key)!, permissionKey: key }));
      const existing = await roles.findOne({ tenantId, name: roleName });
      if (existing) roleRefs[roleName] = String(existing._id);
      else { const roleId = new mongoose.Types.ObjectId(); await roles.insertOne({ _id: roleId, tenantId, companyId: roleName === 'Platform Admin' ? null : companyId, name: roleName, isSystem: true, permissions: permRefs, createdAt: now, updatedAt: now }); roleRefs[roleName] = String(roleId); }
    }
    const adminEmail = 'admin@demo.local';
    if (!(await users.findOne({ email: adminEmail }))) {
      const passwordHash = await argon2.hash('ChangeMe123!', { type: argon2.argon2id });
      await users.insertOne({ _id: new mongoose.Types.ObjectId(), accountType: UserAccountType.TENANT, tenantId: String(tenantId), companyId: String(companyId), email: adminEmail, passwordHash, firstName: 'Demo', lastName: 'Admin', forcePasswordReset: true, isActive: true, roleIds: [roleRefs['Tenant Admin']], backupCodesHash: [], createdAt: now, updatedAt: now });
    }
    const systemEmail = process.env.SYSTEM_ADMIN_EMAIL ?? 'admin@assethub.local';
    if (!(await users.findOne({ email: systemEmail }))) {
      const passwordHash = await argon2.hash(process.env.SYSTEM_ADMIN_PASSWORD ?? 'ChangeMe123!', { type: argon2.argon2id });
      await users.insertOne({ _id: new mongoose.Types.ObjectId(), accountType: UserAccountType.SYSTEM, tenantId: '', companyId: '', email: systemEmail, passwordHash, firstName: 'System', lastName: 'Administrator', forcePasswordReset: true, isActive: true, roleIds: [roleRefs['Platform Admin']], backupCodesHash: [], createdAt: now, updatedAt: now });
    }
    console.log(`Seed complete. Tenant: ${adminEmail} / ChangeMe123!`);
    console.log(`System: ${systemEmail} / ${process.env.SYSTEM_ADMIN_PASSWORD ? '<SYSTEM_ADMIN_PASSWORD>' : 'ChangeMe123!'}`);
  } finally { await connection.close(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
