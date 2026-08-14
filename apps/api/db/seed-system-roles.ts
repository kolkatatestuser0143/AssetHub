import '../src/bootstrap-dns';
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: require('path').resolve(__dirname, '../../../.env') });
import mongoose from 'mongoose';

const PLATFORM_TENANT_ID = process.env.SYSTEM_RBAC_TENANT_ID ?? 'SYSTEM';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Platform Admin': [
    'platform:console:access','platform:overview:read','platform:tenants:read','platform:tenants:manage','platform:users:read','platform:users:manage',
    'platform:roles:read','platform:roles:manage','platform:billing:read','platform:billing:manage','platform:audit:read','platform:health:read',
    'platform:analytics:read','platform:settings:read','platform:settings:manage','platform:support:read','platform:support:manage','platform:manage_tenants',
  ],
  'Sales Manager': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:tenants:manage','platform:billing:read','platform:analytics:read','platform:manage_tenants'],
  'Sales': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:billing:read','platform:manage_tenants'],
  'Billing Manager': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:billing:read','platform:billing:manage','platform:analytics:read','platform:manage_tenants'],
  'Support Manager': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:users:read','platform:support:read','platform:support:manage','platform:audit:read','platform:manage_tenants'],
  'Support Agent': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:users:read','platform:support:read','platform:manage_tenants'],
  'Security Auditor': ['platform:console:access','platform:overview:read','platform:users:read','platform:roles:read','platform:audit:read','platform:health:read','platform:manage_tenants'],
  'Operations Manager': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:users:read','platform:roles:read','platform:health:read','platform:analytics:read','platform:billing:read','platform:manage_tenants'],
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI');
  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    const db = connection.db;
    if (!db) throw new Error('Mongo connection failed');
    const permissions = db.collection('permissions');
    const roles = db.collection('roles');
    const now = new Date();
    const allPermissions = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];

    for (const key of allPermissions) {
      await permissions.updateOne(
        { key },
        { $setOnInsert: { _id: new mongoose.Types.ObjectId(), key, createdAt: now, updatedAt: now } },
        { upsert: true },
      );
    }

    const permissionDocs = await permissions.find({ key: { $in: allPermissions } }).toArray();
    const permissionIds = new Map(permissionDocs.map((p: any) => [p.key, String(p._id)]));

    for (const [name, keys] of Object.entries(ROLE_PERMISSIONS)) {
      const rolePermissions = keys.map((key) => ({ permissionId: permissionIds.get(key)!, permissionKey: key }));
      await roles.updateOne(
        { tenantId: PLATFORM_TENANT_ID, name },
        {
          $set: { tenantId: PLATFORM_TENANT_ID, companyId: null, name, isSystem: true, permissions: rolePermissions, updatedAt: now },
          $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now },
        },
        { upsert: true },
      );
    }

    console.log(`Seeded ${Object.keys(ROLE_PERMISSIONS).length} platform roles under tenant scope ${PLATFORM_TENANT_ID}.`);
    console.log(Object.entries(ROLE_PERMISSIONS).map(([name, permissions]) => `${name}: ${permissions.join(', ')}`).join('\n'));
  } finally {
    await connection.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
