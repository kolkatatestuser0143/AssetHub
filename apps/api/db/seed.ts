import '../src/bootstrap-dns';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: require('path').resolve(__dirname, '../../../.env'), override: true });

import mongoose from 'mongoose';
import * as argon2 from 'argon2';
import { UserAccountType, UserAdminLevel } from '../src/models/user.schemas';
import { TenantStatus } from '../src/models/tenancy.schemas';

function getMongodbUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing required environment variable: MONGODB_URI');
  return uri;
}

const PERMISSIONS = [
  'asset:read','asset:write','asset:bulk_update','asset:delete',
  'company:read','company:write',
  'user:read','user:write',
  'role:read','role:write',
  'identity_provider:read','identity_provider:write','scim:manage',
  'integration:read','integration:write',
  'billing:read','billing:manage',
  'audit:read',
  'platform:console:access','platform:manage_tenants',
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Tenant Admin': PERMISSIONS.filter((permission) => !permission.startsWith('platform:')),
  'Company Admin': ['asset:read','asset:write','asset:bulk_update','company:read','user:read','user:write','role:read','identity_provider:read','audit:read'],
  'IT Manager': ['asset:read','asset:write','asset:bulk_update','user:read'],
  'Read-Only Auditor': ['asset:read','company:read','user:read','audit:read'],
  'Platform Admin': [
    'platform:console:access','platform:overview:read','platform:tenants:read','platform:tenants:manage',
    'platform:users:read','platform:users:manage','platform:roles:read','platform:roles:manage',
    'platform:billing:read','platform:billing:manage','platform:audit:read','platform:health:read',
    'platform:analytics:read','platform:settings:read','platform:settings:manage',
    'platform:support:read','platform:support:manage',
  ],
};

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'asset:read': 'View assets and asset inventory',
  'asset:write': 'Create and update assets',
  'asset:bulk_update': 'Perform bulk asset updates and imports',
  'asset:delete': 'Delete assets and asset types',
  'company:read': 'View company and organization information',
  'company:write': 'Manage companies and organization structure',
  'user:read': 'View tenant users',
  'user:write': 'Create and manage tenant users',
  'role:read': 'View roles and permissions',
  'role:write': 'Manage tenant roles and permissions',
  'identity_provider:read': 'View identity provider configuration',
  'identity_provider:write': 'Manage identity provider configuration',
  'scim:manage': 'Manage SCIM provisioning',
  'integration:read': 'View integrations',
  'integration:write': 'Manage integrations',
  'billing:read': 'View billing and subscription details',
  'billing:manage': 'Manage tenant billing settings',
  'audit:read': 'View audit logs',
  'platform:console:access': 'Access the system administrator console',
  'platform:manage_tenants': 'Manage platform tenants',
};

const PROFESSIONAL_FEATURES: Record<string, unknown> = {
  max_assets: 5000,
  max_users: 100,
  max_companies: 10,
  max_sites: 100,
  max_locations: 100,
  max_departments: 500,
  max_vendors: 500,
  max_asset_documents: 10000,
  max_saved_reports: 50,
  max_api_keys: 10,
  max_integrations: 10,
  max_storage_gb: 50,
  max_asset_document_size_mb: 50,
  max_api_rate_limit_per_minute: 300,
  session_max_days: 30,
  max_concurrent_sessions: 10,
  audit_retention_days: 365,
  sso_enabled: true,
  scim_enabled: false,
  mfa_enabled: true,
  audit_enabled: true,
  advanced_reports_enabled: true,
  scheduled_reports_enabled: true,
  asset_documents_enabled: true,
  bulk_import_enabled: true,
  api_access_enabled: true,
  webhooks_enabled: true,
  custom_roles_enabled: true,
  custom_fields_enabled: true,
  approval_workflows_enabled: true,
};

const DEFAULT_TENANT_EMAIL = 'admin@demo.local';
const DEFAULT_TENANT_PASSWORD = 'ChangeMe1234567!';
const DEFAULT_SYSTEM_EMAIL = 'admin@assethub.local';
const DEFAULT_SYSTEM_PASSWORD = 'ChangeMe1234567!';

function resolveSeedCredential(variableName: string, fallback: string): string {
  const configured = process.env[variableName];
  const devMode = process.env.SEED_DEV_MODE === 'true';
  if (!configured && !devMode) throw new Error(`${variableName} must be configured unless SEED_DEV_MODE=true`);
  if (configured && configured.length < 16) throw new Error(`${variableName} must be at least 16 characters`);
  return configured ?? fallback;
}

async function upsertSeedUser(args: {
  users: any;
  email: string;
  password: string;
  accountType: UserAccountType;
  tenantId: string;
  companyId: string;
  roleId: string;
  adminLevel: UserAdminLevel;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  employeeId?: string;
  departmentId?: string;
  locationId?: string;
  forcePasswordReset: boolean;
}) {
  const now = new Date();
  const passwordHash = await argon2.hash(args.password, { type: argon2.argon2id });
  const setFields: Record<string, unknown> = {
    accountType: args.accountType,
    tenantId: args.tenantId,
    companyId: args.companyId,
    adminLevel: args.adminLevel,
    passwordHash,
    firstName: args.firstName,
    lastName: args.lastName,
    jobTitle: args.jobTitle,
    phone: args.phone,
    forcePasswordReset: args.forcePasswordReset,
    isActive: true,
    roleIds: [args.roleId],
    backupCodesHash: [],
    mfaMethod: 'NONE',
    failedLoginAttempts: 0,
    updatedAt: now,
  };
  if (args.employeeId !== undefined) setFields.employeeId = args.employeeId;
  if (args.departmentId !== undefined) setFields.departmentId = args.departmentId;
  if (args.locationId !== undefined) setFields.locationId = args.locationId;

  await args.users.updateOne(
    { email: args.email },
    {
      $set: setFields,
      $unset: { lockedUntil: '', accessTokenHash: '', accessTokenIssuedAt: '', accessTokenExpiresAt: '' },
      $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now, authVersion: 0 },
    },
    { upsert: true },
  );

  const user = await args.users.findOne({ email: args.email }, { projection: { _id: 1 } });
  if (!user?._id) throw new Error(`Failed to seed user: ${args.email}`);
  return String(user._id);
}

async function upsertRole(roles: any, tenantId: string, companyId: string | null, roleName: string, permissionRefs: Array<{ permissionId: string; permissionKey: string }>, now: Date): Promise<string> {
  const result = await roles.findOneAndUpdate(
    { tenantId, name: roleName },
    {
      $set: {
        tenantId,
        ...(companyId ? { companyId } : { companyId: null }),
        name: roleName,
        isSystem: true,
        permissions: permissionRefs,
        updatedAt: now,
      },
      $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );
  if (!result?._id) throw new Error(`Failed to seed role: ${roleName}`);
  return String(result._id);
}

async function ensurePlanAndSubscription(args: { plans: any; subscriptions: any; entitlements: any; tenantId: string; now: Date }) {
  const { plans, subscriptions, entitlements, tenantId, now } = args;
  const planResult = await plans.findOneAndUpdate(
    { name: 'Professional' },
    {
      $set: { name: 'Professional', themePreset: 'professional', features: PROFESSIONAL_FEATURES, isActive: true, updatedAt: now },
      $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );
  if (!planResult?._id) throw new Error('Failed to seed Professional plan');

  const subscriptionResult = await subscriptions.findOneAndUpdate(
    { tenantId },
    {
      $set: { tenantId, planId: String(planResult._id), status: 'active', startedAt: now, updatedAt: now },
      $unset: { endsAt: '', graceUntil: '' },
      $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );
  if (!subscriptionResult?._id) throw new Error('Failed to seed tenant subscription');

  const subscriptionId = String(subscriptionResult._id);
  for (const [key, value] of Object.entries(PROFESSIONAL_FEATURES)) {
    await entitlements.updateOne(
      { subscriptionId, key },
      { $set: { subscriptionId, key, value, source: 'plan', updatedAt: now }, $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now } },
      { upsert: true },
    );
  }
  return { planId: String(planResult._id), subscriptionId };
}

async function main() {
  const connection = await mongoose.createConnection(getMongodbUri()).asPromise();
  try {
    const db = connection.db;
    if (!db) throw new Error('Mongo connection failed: native db handle is undefined');

    const now = new Date();
    const tenants = db.collection('tenants');
    const companies = db.collection('companies');
    const sites = db.collection('plants');
    const locations = db.collection('locations');
    const departments = db.collection('departments');
    const permissions = db.collection('permissions');
    const roles = db.collection('roles');
    const users = db.collection('users');
    const plans = db.collection('plans');
    const subscriptions = db.collection('subscriptions');
    const entitlements = db.collection('entitlements');
    const assetTypes = db.collection('asset_types');
    const vendors = db.collection('vendors');
    const assets = db.collection('assets');

    await users.updateMany({ accountType: { $exists: false } }, { $set: { accountType: UserAccountType.TENANT, adminLevel: UserAdminLevel.EMPLOYEE } });

    for (const key of PERMISSIONS) {
      await permissions.updateOne(
        { key },
        { $set: { key, description: PERMISSION_DESCRIPTIONS[key] ?? key, updatedAt: now }, $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now } },
        { upsert: true },
      );
    }

    const permissionDocs = await permissions.find({ key: { $in: [...new Set(Object.values(ROLE_PERMISSIONS).flat())] } }).toArray();
    const permissionByKey = new Map(permissionDocs.map((permission) => [permission.key as string, String(permission._id)]));
    for (const rolePermissions of Object.values(ROLE_PERMISSIONS)) {
      for (const key of rolePermissions) if (!permissionByKey.has(key)) throw new Error(`Missing permission key after seed: ${key}`);
    }

    let tenant = await tenants.findOne({ slug: 'demo' });
    const tenantId = tenant?._id ? String(tenant._id) : new mongoose.Types.ObjectId().toString();
    const demoTenantValues = {
      name: 'Demo Tenant',
      slug: 'demo',
      status: TenantStatus.ACTIVE,
      primaryEmail: process.env.TENANT_ADMIN_EMAIL ?? DEFAULT_TENANT_EMAIL,
      phone: '+91-90000-00001',
      website: 'https://demo.local',
      updatedAt: now,
    };
    if (!tenant) {
      await tenants.insertOne({ _id: new mongoose.Types.ObjectId(tenantId), ...demoTenantValues, createdAt: now });
      tenant = await tenants.findOne({ slug: 'demo' });
    } else {
      await tenants.updateOne({ _id: tenant._id }, { $set: demoTenantValues, $unset: { suspendedAt: '', suspendedBy: '', suspensionReason: '' } });
    }
    if (!tenant?._id) throw new Error('Failed to seed demo tenant');

    let company = await companies.findOne({ tenantId, code: 'DEMO' });
    const companyId = company?._id ? String(company._id) : new mongoose.Types.ObjectId().toString();
    if (!company) {
      await companies.insertOne({ _id: new mongoose.Types.ObjectId(companyId), tenantId, name: 'Demo Company Pvt. Ltd.', code: 'DEMO', createdAt: now, updatedAt: now });
    } else {
      await companies.updateOne({ _id: company._id }, { $set: { tenantId, name: 'Demo Company Pvt. Ltd.', code: 'DEMO', updatedAt: now } });
    }

    let site = await sites.findOne({ companyId, name: 'Demo Head Office' });
    const siteId = site?._id ? String(site._id) : new mongoose.Types.ObjectId().toString();
    if (!site) await sites.insertOne({ _id: new mongoose.Types.ObjectId(siteId), companyId, type: 'head_office', name: 'Demo Head Office', createdAt: now, updatedAt: now });

    let location = await locations.findOne({ plantId: siteId, name: 'IT Department Floor' });
    const locationId = location?._id ? String(location._id) : new mongoose.Types.ObjectId().toString();
    if (!location) await locations.insertOne({ _id: new mongoose.Types.ObjectId(locationId), plantId: siteId, name: 'IT Department Floor', createdAt: now, updatedAt: now });

    let department = await departments.findOne({ locationId, name: 'Information Technology' });
    const departmentId = department?._id ? String(department._id) : new mongoose.Types.ObjectId().toString();
    if (!department) await departments.insertOne({ _id: new mongoose.Types.ObjectId(departmentId), locationId, name: 'Information Technology', createdAt: now, updatedAt: now });

    const roleRefs: Record<string, string> = {};
    for (const [roleName, rolePermissions] of Object.entries(ROLE_PERMISSIONS)) {
      const permissionRefs = rolePermissions.map((permissionKey) => ({ permissionId: permissionByKey.get(permissionKey)!, permissionKey }));
      roleRefs[roleName] = await upsertRole(roles, tenantId, roleName === 'Platform Admin' ? null : companyId, roleName, permissionRefs, now);
    }

    await ensurePlanAndSubscription({ plans, subscriptions, entitlements, tenantId, now });

    const tenantEmail = process.env.TENANT_ADMIN_EMAIL ?? DEFAULT_TENANT_EMAIL;
    const tenantPassword = resolveSeedCredential('TENANT_ADMIN_PASSWORD', DEFAULT_TENANT_PASSWORD);
    const tenantUserId = await upsertSeedUser({
      users,
      email: tenantEmail,
      password: tenantPassword,
      accountType: UserAccountType.TENANT,
      tenantId,
      companyId,
      roleId: roleRefs['Tenant Admin'],
      adminLevel: UserAdminLevel.TENANT_ADMIN,
      firstName: 'Demo',
      lastName: 'Admin',
      jobTitle: 'Tenant Administrator',
      phone: '+91-90000-00002',
      employeeId: 'DEMO-ADMIN-001',
      departmentId,
      locationId,
      forcePasswordReset: true,
    });

    await tenants.updateOne({ _id: tenant._id }, { $set: { primaryUserId: tenantUserId, primaryEmail: tenantEmail, updatedAt: now } });

    const systemEmail = process.env.SYSTEM_ADMIN_EMAIL ?? DEFAULT_SYSTEM_EMAIL;
    const systemPassword = resolveSeedCredential('SYSTEM_ADMIN_PASSWORD', DEFAULT_SYSTEM_PASSWORD);
    await upsertSeedUser({
      users,
      email: systemEmail,
      password: systemPassword,
      accountType: UserAccountType.SYSTEM,
      tenantId: '',
      companyId: '',
      roleId: roleRefs['Platform Admin'],
      adminLevel: UserAdminLevel.EMPLOYEE,
      firstName: 'System',
      lastName: 'Administrator',
      jobTitle: 'Platform Administrator',
      phone: '+91-90000-00000',
      forcePasswordReset: true,
    });

    const assetTypeSeeds = [
      { name: 'Laptop', prefix: 'LAP' },
      { name: 'Desktop', prefix: 'DSK' },
      { name: 'Monitor', prefix: 'MON' },
      { name: 'Mobile', prefix: 'MOB' },
      { name: 'Network Device', prefix: 'NET' },
    ];
    for (const item of assetTypeSeeds) {
      await assetTypes.updateOne(
        { companyId, name: item.name },
        { $set: { companyId, name: item.name, numberingRule: { prefix: item.prefix, separator: '-', padding: 6, nextSequence: 1 }, updatedAt: now }, $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now } },
        { upsert: true },
      );
    }

    const vendorResult = await vendors.findOneAndUpdate(
      { companyId, name: 'Demo IT Supplies' },
      { $set: { companyId, name: 'Demo IT Supplies', contact: 'sales@demo.local', updatedAt: now }, $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now } },
      { upsert: true, returnDocument: 'after' },
    );

    const laptopType = await assetTypes.findOne({ companyId, name: 'Laptop' });
    if (laptopType?._id) {
      await assets.updateOne(
        { companyId, assetNumber: 'LAP-000001' },
        {
          $set: {
            tenantId,
            companyId,
            assetTypeId: String(laptopType._id),
            assetNumber: 'LAP-000001',
            serialNumber: 'DEMO-LAP-001',
            model: 'ThinkPad T14 Gen 5',
            status: 'IN_STOCK',
            condition: 'GOOD',
            locationId,
            departmentId,
            ...(vendorResult?._id ? { vendorId: String(vendorResult._id) } : {}),
            customFields: {},
            updatedAt: now,
          },
          $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now },
        },
        { upsert: true },
      );
    }

    console.log('Seed complete.');
    console.log(`Tenant login: ${tenantEmail}`);
    console.log(`Tenant admin role: ${roleRefs['Tenant Admin']}`);
    console.log(`Tenant admin level: ${UserAdminLevel.TENANT_ADMIN}`);
    console.log(`System login: ${systemEmail}`);
    console.log('System admin level: PLATFORM ADMIN');
    console.log('Demo tenant subscription: Professional / active');
    console.log('Demo tenant organization: Head Office -> IT Department Floor -> Information Technology');
    console.log('Demo tenant asset types: Laptop, Desktop, Monitor, Mobile, Network Device');
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
