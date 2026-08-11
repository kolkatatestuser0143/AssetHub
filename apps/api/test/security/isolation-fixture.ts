import * as mongoose from 'mongoose';
import * as argon2 from 'argon2';
import { Model } from 'mongoose';
import { TenantModelName, TenantSchema } from '../../src/models/tenancy.schemas';
import { CompanyModelName, CompanySchema } from '../../src/models/tenancy.schemas';
import { UserModelName, UserSchema } from '../../src/models/user.schemas';
import { AssetModelName, AssetSchema, AssetTypeModelName, AssetTypeSchema } from '../../src/models/asset.schemas';
import { MongooseDatabaseService } from '../../src/common/mongoose-database.service';
import { AuthContext } from '../../src/common/guards/tenant-context.guard';

export interface TestDb {
  mongoose: typeof mongoose;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  clearTestCollections(): Promise<void>;
  db: MongooseDatabaseService;
}

export async function connectTestDb(): Promise<TestDb> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI must point at a disposable test database');

  // Use a dedicated connection for the security fixture. This avoids relying
  // on the global mongoose connection, which can be undefined when Jest and
  // the application resolve Mongoose through different module instances.
  const connection = await mongoose.createConnection(uri).asPromise();

  const models: Array<[string, mongoose.Schema]> = [
    [TenantModelName, TenantSchema],
    [CompanyModelName, CompanySchema],
    [UserModelName, UserSchema],
    [AssetTypeModelName, AssetTypeSchema],
    [AssetModelName, AssetSchema],
  ];
  const modelMap = new Map<string, Model<any>>();
  for (const [name, schema] of models) {
    modelMap.set(name, connection.models[name] ?? connection.model(name, schema));
  }

  const db = new MongooseDatabaseService(
    modelMap.get(TenantModelName)!, modelMap.get(CompanyModelName)!,
    null as any, null as any, null as any, null as any,
    modelMap.get(UserModelName)!, null as any, null as any,
    null as any, null as any, modelMap.get(AssetTypeModelName)!,
    modelMap.get(AssetModelName)!,
    null as any, null as any,
    null as any, null as any, null as any, null as any, null as any,
    null as any, null as any, null as any,
    null as any,
    null as any, null as any, null as any,
    null as any, null as any,
  );

  const collection = (name: string) => connection.collection(name);

  return {
    mongoose,
    connect: async () => {},
    disconnect: async () => connection.close(),
    clearTestCollections: async () => {
      await Promise.all([
        collection('asset_audit_events').deleteMany({}),
        collection('assets').deleteMany({}),
        collection('asset_types').deleteMany({}),
        collection('users').deleteMany({}),
        collection('companies').deleteMany({}),
        collection('tenants').deleteMany({}),
      ]);
    },
    db,
  };
}

export async function seedTwoTenants(db: MongooseDatabaseService) {
  const suffix = Date.now();
  const tenantA = await db.tenant.create({ name: 'Tenant A', slug: `tenant-a-${suffix}` });
  const tenantB = await db.tenant.create({ name: 'Tenant B', slug: `tenant-b-${suffix}` });
  const companyA = await db.company.create({ tenantId: String(tenantA._id), name: 'Company A', code: 'AAA' });
  const companyB = await db.company.create({ tenantId: String(tenantB._id), name: 'Company B', code: 'BBB' });
  const passwordHash = await argon2.hash('TestPassword123!', { type: argon2.argon2id });
  const userA = await db.user.create({ tenantId: String(tenantA._id), companyId: String(companyA._id), email: `user-a-${suffix}@example.com`, passwordHash, firstName: 'A', lastName: 'User' });
  const userB = await db.user.create({ tenantId: String(tenantB._id), companyId: String(companyB._id), email: `user-b-${suffix}@example.com`, passwordHash, firstName: 'B', lastName: 'User' });
  const assetTypeA = await db.assetType.create({ companyId: String(companyA._id), name: 'Laptop', numberingRule: { prefix: 'LAP', separator: '-', padding: 6, nextSequence: 1 } });
  const assetTypeB = await db.assetType.create({ companyId: String(companyB._id), name: 'Laptop', numberingRule: { prefix: 'LAP', separator: '-', padding: 6, nextSequence: 1 } });

  const authA: AuthContext = {
    userId: String(userA._id), sessionId: `test-session-a-${suffix}`,
    tenantId: String(tenantA._id), companyId: String(companyA._id), crossCompany: false,
    permissions: ['asset:read', 'asset:write', 'company:read', 'company:write'],
  };
  const authB: AuthContext = {
    userId: String(userB._id), sessionId: `test-session-b-${suffix}`,
    tenantId: String(tenantB._id), companyId: String(companyB._id), crossCompany: false,
    permissions: ['asset:read', 'asset:write', 'company:read', 'company:write'],
  };

  return {
    tenantA: { id: String(tenantA._id), _id: tenantA._id }, tenantB: { id: String(tenantB._id), _id: tenantB._id },
    companyA: { id: String(companyA._id), _id: companyA._id }, companyB: { id: String(companyB._id), _id: companyB._id },
    assetTypeA: { id: String(assetTypeA._id), _id: assetTypeA._id }, assetTypeB: { id: String(assetTypeB._id), _id: assetTypeB._id },
    authA, authB,
  };
}
