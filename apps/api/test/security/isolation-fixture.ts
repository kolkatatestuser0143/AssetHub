import * as mongoose from 'mongoose';
import * as argon2 from 'argon2';
import { TenantModelName, TenantSchema, CompanyModelName, CompanySchema } from '../../src/models/tenancy.schemas';
import { UserModelName, UserSchema } from '../../src/models/user.schemas';
import { AssetModelName, AssetSchema, AssetTypeModelName, AssetTypeSchema } from '../../src/models/asset.schemas';
import { MongooseDatabaseService } from '../../src/common/mongoose-database.service';
import { AuthContext } from '../../src/common/guards/tenant-context.guard';

export interface TestDb { mongoose: typeof mongoose; connect(): Promise<void>; disconnect(): Promise<void>; clearTestCollections(): Promise<void>; db: MongooseDatabaseService; }

export async function connectTestDb(): Promise<TestDb> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI must point at a disposable test database');
  const connection = await mongoose.createConnection(uri).asPromise();
  const tenantModel = connection.models[TenantModelName] ?? connection.model(TenantModelName, TenantSchema);
  const companyModel = connection.models[CompanyModelName] ?? connection.model(CompanyModelName, CompanySchema);
  const userModel = connection.models[UserModelName] ?? connection.model(UserModelName, UserSchema);
  const assetTypeModel = connection.models[AssetTypeModelName] ?? connection.model(AssetTypeModelName, AssetTypeSchema);
  const assetModel = connection.models[AssetModelName] ?? connection.model(AssetModelName, AssetSchema);

  const db = new MongooseDatabaseService(
    tenantModel,
    companyModel,
    null as any, // plant
    null as any, // location
    null as any, // department
    userModel,
    null as any, // session
    null as any, // loginHistory
    null as any, // permission
    null as any, // role
    assetTypeModel,
    assetModel,
    null as any, // assetAuditEvent
    null as any, // assetAssignment
    null as any, // assetTransfer
    null as any, // assetMaintenance
    null as any, // vendor
    null as any, // warranty
    null as any, // customFieldDefinition
    null as any, // assetCustomFieldValue
    null as any, // assetDocument
    null as any, // identityProviderConfig
    null as any, // scimToken
    null as any, // scimSyncLog
    null as any, // integrationInstance
    null as any, // plan
    null as any, // subscription
    null as any, // entitlement
    null as any, // auditEvent
    null as any, // platformAdminNote
    null as any, // assetReportTemplate
    null as any, // assetAcknowledgementTemplate
    null as any, // assetAcknowledgement
  );

  Object.assign(db, { tenant: tenantModel, company: companyModel, user: userModel, assetType: assetTypeModel, asset: assetModel });
  const collection = (name: string) => connection.collection(name);
  return {
    mongoose,
    connect: async () => {},
    disconnect: async () => connection.close(),
    clearTestCollections: async () => Promise.all(['asset_audit_events','assets','asset_types','users','companies','tenants'].map((name) => collection(name).deleteMany({}))).then(() => undefined),
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
  const userA = await db.user.create({ tenantId: String(tenantA._id), companyId: String(companyA._id), email: `user-a-${suffix}@example.com`, passwordHash, firstName: 'A', lastName: 'User', authVersion: 0 });
  const userB = await db.user.create({ tenantId: String(tenantB._id), companyId: String(companyB._id), email: `user-b-${suffix}@example.com`, passwordHash, firstName: 'B', lastName: 'User', authVersion: 0 });
  const assetTypeA = await db.assetType.create({ companyId: String(companyA._id), name: 'Laptop', numberingRule: { prefix: 'LAP', separator: '-', padding: 6, nextSequence: 1 } });
  const assetTypeB = await db.assetType.create({ companyId: String(companyB._id), name: 'Laptop', numberingRule: { prefix: 'LAP', separator: '-', padding: 6, nextSequence: 1 } });
  const authA: AuthContext = { userId: String(userA._id), sessionId: `test-session-a-${suffix}`, tenantId: String(tenantA._id), companyId: String(companyA._id), crossCompany: false, permissions: ['asset:read','asset:write','company:read','company:write'], forcePasswordReset: false, authVersion: 0 };
  const authB: AuthContext = { userId: String(userB._id), sessionId: `test-session-b-${suffix}`, tenantId: String(tenantB._id), companyId: String(companyB._id), crossCompany: false, permissions: ['asset:read','asset:write','company:read','company:write'], forcePasswordReset: false, authVersion: 0 };
  return { tenantA: { id: String(tenantA._id), _id: tenantA._id }, tenantB: { id: String(tenantB._id), _id: tenantB._id }, companyA: { id: String(companyA._id), _id: companyA._id }, companyB: { id: String(companyB._id), _id: companyB._id }, assetTypeA: { id: String(assetTypeA._id), _id: assetTypeA._id }, assetTypeB: { id: String(assetTypeB._id), _id: assetTypeB._id }, authA, authB };
}
