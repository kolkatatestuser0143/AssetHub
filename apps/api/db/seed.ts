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

const DEFAULT_TENANT_EMAIL = 'admin@demo.local';
const DEFAULT_TENANT_PASSWORD = 'ChangeMe123!';
const DEFAULT_SYSTEM_EMAIL = 'admin@assethub.local';
const DEFAULT_SYSTEM_PASSWORD = 'ChangeMe123!';

async function upsertSeedUser(args: {
  users: any;
  email: string;
  password: string;
  accountType: UserAccountType;
  tenantId: string;
  companyId: string;
  roleId: string;
  firstName: string;
  lastName: string;
}) {
  const now = new Date();
  const passwordHash = await argon2.hash(args.password, { type: argon2.argon2id });
  await args.users.updateOne(
    { email: args.email },
    {
      $set: {
        accountType: args.accountType,
        tenantId: args.tenantId,
        companyId: args.companyId,
        passwordHash,
        firstName: args.firstName,
        lastName: args.lastName,
        forcePasswordReset: true,
        isActive: true,
        roleIds: [args.roleId],
        backupCodesHash: [],
        updatedAt: now,
      },
      $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now },
    },
    { upsert: true },
  );
}

async function main() {
  const connection = await mongoose.createConnection(getMongodbUri()).asPromise();
  try {
    const db = connection.db;
    if (!db) throw new Error('Mongo connection failed: native db handle is undefined');
    const tenants = db.collection('tenants');
    const companies = db.collection('companies');
    const permissions = db.collection('permissions');
    const roles = db.collection('roles');
    const users = db.collection('users');
    const now = new Date();

    await users.updateMany({ accountType: { $exists: false } }, { $set: { accountType: UserAccountType.TENANT } });

    for (const key of PERMISSIONS) {
      await permissions.updateOne(
        { key },
        { $setOnInsert: { key, _id: new mongoose.Types.ObjectId(), createdAt: now, updatedAt: now } },
        { upsert: true },
      );
    }
    const permDocs = await permissions.find({}).toArray();
    const permByKey = new Map(permDocs.map((p) => [p.key as string, String(p._id)]));

    const tenantDoc = await tenants.findOne({ slug: 'demo' });
    const tenantId = tenantDoc ? tenantDoc._id as mongoose.Types.ObjectId : new mongoose.Types.ObjectId();
    if (!tenantDoc) await tenants.insertOne({ _id: tenantId, name: 'Demo Tenant', slug: 'demo', createdAt: now, updatedAt: now });

    const companyDoc = await companies.findOne({ tenantId, code: 'DEMO' });
    const companyId = companyDoc ? companyDoc._id as mongoose.Types.ObjectId : new mongoose.Types.ObjectId();
    if (!companyDoc) await companies.insertOne({ _id: companyId, tenantId, name: 'Demo Company', code: 'DEMO', createdAt: now, updatedAt: now });

    // Repair legacy demo roles that were created with an ObjectId tenantId or no tenantId.
    await roles.updateMany(
      {
        name: { $in: Object.keys(SYSTEM_ROLES) },
        $or: [
          { tenantId: tenantId },
          { tenantId: { $exists: false } },
          { tenantId: null },
        ],
      },
      { $set: { tenantId: String(tenantId), updatedAt: now } },
    );

    const roleRefs: Record<string, string> = {};
    for (const [roleName, perms] of Object.entries(SYSTEM_ROLES)) {
      const permRefs = perms.map((key) => {
        const permissionId = permByKey.get(key);
        if (!permissionId) throw new Error(`Missing permission key: ${key}`);
        return { permissionId, permissionKey: key };
      });
      const roleId = new mongoose.Types.ObjectId();
      const result = await roles.findOneAndUpdate(
        { tenantId: String(tenantId), name: roleName },
        {
          $set: {
            tenantId: String(tenantId),
            companyId: roleName === 'Platform Admin' ? null : String(companyId),
            isSystem: true,
            permissions: permRefs,
            updatedAt: now,
          },
          $setOnInsert: { _id: roleId, createdAt: now },
        },
        { upsert: true, returnDocument: 'after' },
      );
      roleRefs[roleName] = String(result?._id ?? roleId);
    }

    const tenantEmail = process.env.TENANT_ADMIN_EMAIL ?? DEFAULT_TENANT_EMAIL;
    const tenantPassword = process.env.TENANT_ADMIN_PASSWORD ?? DEFAULT_TENANT_PASSWORD;
    await upsertSeedUser({ users, email: tenantEmail, password: tenantPassword, accountType: UserAccountType.TENANT, tenantId: String(tenantId), companyId: String(companyId), roleId: roleRefs['Tenant Admin'], firstName: 'Demo', lastName: 'Admin' });

    const systemEmail = process.env.SYSTEM_ADMIN_EMAIL ?? DEFAULT_SYSTEM_EMAIL;
    const systemPassword = process.env.SYSTEM_ADMIN_PASSWORD ?? DEFAULT_SYSTEM_PASSWORD;
    await upsertSeedUser({ users, email: systemEmail, password: systemPassword, accountType: UserAccountType.SYSTEM, tenantId: '', companyId: '', roleId: roleRefs['Platform Admin'], firstName: 'System', lastName: 'Administrator' });

    console.log(`Seed complete. Tenant: ${tenantEmail} / ${process.env.TENANT_ADMIN_PASSWORD ? '<TENANT_ADMIN_PASSWORD>' : DEFAULT_TENANT_PASSWORD}`);
    console.log(`System: ${systemEmail} / ${process.env.SYSTEM_ADMIN_PASSWORD ? '<SYSTEM_ADMIN_PASSWORD>' : DEFAULT_SYSTEM_PASSWORD}`);
  } finally {
    await connection.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
