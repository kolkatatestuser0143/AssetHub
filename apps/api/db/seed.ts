import '../src/bootstrap-dns';
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: require('path').resolve(__dirname, '../../../.env') });
import * as mongoose from 'mongoose';
import * as argon2 from 'argon2';

function getMongodbUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing required environment variable: MONGODB_URI');
  }
  return uri;
}

const PERMISSIONS = [
  'asset:read', 'asset:write', 'asset:bulk_update', 'asset:delete',
  'company:read', 'company:write',
  'user:read', 'user:write',
  'role:read', 'role:write',
  'identity_provider:read', 'identity_provider:write',
  'scim:manage',
  'integration:read', 'integration:write',
  'billing:read', 'billing:manage',
  'audit:read',
  'platform:manage_tenants',
];

const SYSTEM_ROLES: Record<string, string[]> = {
  'Tenant Admin': PERMISSIONS.filter((p) => !p.startsWith('platform:')),
  'Company Admin': [
    'asset:read', 'asset:write', 'asset:bulk_update',
    'company:read', 'user:read', 'user:write',
    'role:read', 'identity_provider:read', 'audit:read',
  ],
  'IT Manager': ['asset:read', 'asset:write', 'asset:bulk_update', 'user:read'],
  'Read-Only Auditor': ['asset:read', 'company:read', 'user:read', 'audit:read'],
  'Platform Admin': ['platform:manage_tenants'],
};

async function main() {
  await mongoose.connect(getMongodbUri());
  const db = mongoose.connection.db;
  if (!db) throw new Error('Mongo connection failed: db is undefined');

  const tenants = db.collection('tenants');
  const companies = db.collection('companies');
  const permissions = db.collection('permissions');
  const roles = db.collection('roles');
  const users = db.collection('users');

  // --- Permissions: idempotent upsert by key ---
  const now = new Date();
  for (const key of PERMISSIONS) {
    await permissions.updateOne(
      { key },
      {
        $setOnInsert: {
          key,
          _id: new mongoose.Types.ObjectId(),
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }
  const permDocs = await permissions.find({}).toArray();
  const permByKey = new Map(permDocs.map((p) => [p.key as string, String(p._id)]));

  // --- Demo tenant: reuse existing _id if present (re-runnable) ---
  let tenantDoc = await tenants.findOne({ slug: 'demo' });
  let tenantId: mongoose.Types.ObjectId;
  if (tenantDoc) {
    tenantId = tenantDoc._id as mongoose.Types.ObjectId;
  } else {
    tenantId = new mongoose.Types.ObjectId();
    await tenants.insertOne({
      _id: tenantId,
      name: 'Demo Tenant',
      slug: 'demo',
      createdAt: now,
      updatedAt: now,
    });
  }

  // --- Demo company: scoped by the EXISTING tenant id ---
  let companyDoc = await companies.findOne({ tenantId, code: 'DEMO' });
  let companyId: mongoose.Types.ObjectId;
  if (companyDoc) {
    companyId = companyDoc._id as mongoose.Types.ObjectId;
  } else {
    companyId = new mongoose.Types.ObjectId();
    await companies.insertOne({
      _id: companyId,
      tenantId,
      name: 'Demo Company',
      code: 'DEMO',
      createdAt: now,
      updatedAt: now,
    });
  }

  // --- System roles: upsert per (tenantId, name), reuse existing ids ---
  const roleRefs: Record<string, string> = {};
  for (const [roleName, perms] of Object.entries(SYSTEM_ROLES)) {
    const permRefs = perms.map((key) => {
      const pid = permByKey.get(key);
      if (!pid) throw new Error(`Missing permission key: ${key}`);
      return { permissionId: pid, permissionKey: key };
    });

    const roleDoc = await roles.findOne({ tenantId, name: roleName });
    if (roleDoc) {
      roleRefs[roleName] = String(roleDoc._id);
      continue;
    }

    const roleId = new mongoose.Types.ObjectId();
    await roles.insertOne({
      _id: roleId,
      tenantId,
      companyId: roleName === 'Platform Admin' ? null : companyId,
      name: roleName,
      isSystem: true,
      permissions: permRefs,
      createdAt: now,
      updatedAt: now,
    });
    roleRefs[roleName] = String(roleId);
  }

  // --- Demo admin: upsert by email; on first insert, attach Tenant Admin role ---
  const adminEmail = 'admin@demo.local';
  const existingAdmin = await users.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = await argon2.hash('ChangeMe123!', { type: argon2.argon2id });
    await users.insertOne({
      _id: new mongoose.Types.ObjectId(),
      tenantId,
      companyId,
      email: adminEmail,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      forcePasswordReset: true,
      isActive: true,
      roleIds: [roleRefs['Tenant Admin']],
      backupCodesHash: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log('Seed complete. Demo login: admin@demo.local / ChangeMe123! (must be rotated).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());

