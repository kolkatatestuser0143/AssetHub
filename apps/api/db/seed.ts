import '../src/bootstrap-dns';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
loadEnv({ path: resolve(__dirname, '../../../.env'), override: true });

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

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

function credential(name: string, fallback: string) {
  const value = process.env[name];
  if (!value && process.env.SEED_DEV_MODE !== 'true') throw new Error(`${name} must be configured unless SEED_DEV_MODE=true`);
  if (value && value.length < 16) throw new Error(`${name} must be at least 16 characters`);
  return value ?? fallback;
}

async function upsertUser(args: {
  email: string; password: string; accountType: string; tenantId: string; companyId: string;
  roleIds: string[]; adminLevel: string; firstName: string; lastName: string; jobTitle: string;
  phone: string; employeeId?: string; departmentId?: string; locationId?: string; forcePasswordReset?: boolean;
}) {
  const passwordHash = await argon2.hash(args.password, { type: argon2.argon2id });
  return prisma.user.upsert({
    where: { tenantId_email: { tenantId: args.tenantId, email: args.email } },
    create: {
      tenantId: args.tenantId, companyId: args.companyId, email: args.email, passwordHash,
      accountType: args.accountType, adminLevel: args.adminLevel, firstName: args.firstName,
      lastName: args.lastName, jobTitle: args.jobTitle, phone: args.phone,
      employeeId: args.employeeId, departmentId: args.departmentId, locationId: args.locationId,
      forcePasswordReset: args.forcePasswordReset ?? true, roleIds: args.roleIds,
    },
    update: {
      companyId: args.companyId, passwordHash, accountType: args.accountType, adminLevel: args.adminLevel,
      firstName: args.firstName, lastName: args.lastName, jobTitle: args.jobTitle, phone: args.phone,
      employeeId: args.employeeId, departmentId: args.departmentId, locationId: args.locationId,
      forcePasswordReset: args.forcePasswordReset ?? true, roleIds: args.roleIds,
      isActive: true, failedLoginAttempts: 0, lockedUntil: null, accessTokenHash: null,
      accessTokenIssuedAt: null, accessTokenExpiresAt: null, updatedAt: new Date(),
    },
  });
}

async function main() {
  const now = new Date();

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    create: { name: 'Demo Tenant', slug: 'demo', status: 'active', primaryEmail: process.env.TENANT_ADMIN_EMAIL ?? DEFAULT_TENANT_EMAIL, phone: '+91-90000-00001', website: 'https://demo.local' },
    update: { name: 'Demo Tenant', status: 'active', primaryEmail: process.env.TENANT_ADMIN_EMAIL ?? DEFAULT_TENANT_EMAIL, phone: '+91-90000-00001', website: 'https://demo.local', suspendedAt: null, suspendedBy: null, suspensionReason: null },
  });

  const company = await prisma.company.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'DEMO' } },
    create: { tenantId: tenant.id, name: 'Demo Company Pvt. Ltd.', code: 'DEMO' },
    update: { name: 'Demo Company Pvt. Ltd.' },
  });

  const site = await prisma.site.findFirst({ where: { companyId: company.id, name: 'Demo Head Office' } }) ?? await prisma.site.create({ data: { tenantId: tenant.id, companyId: company.id, type: 'head_office', name: 'Demo Head Office' } });
  const location = await prisma.location.findFirst({ where: { siteId: site.id, name: 'IT Department Floor' } }) ?? await prisma.location.create({ data: { siteId: site.id, name: 'IT Department Floor' } });
  const department = await prisma.department.findFirst({ where: { locationId: location.id, name: 'Information Technology' } }) ?? await prisma.department.create({ data: { locationId: location.id, name: 'Information Technology' } });

  // Roles are represented by stable role identifiers until the dedicated RBAC persistence models are introduced.
  const tenantAdminRole = 'tenant-admin';
  const platformAdminRole = 'platform-admin';

  const plan = await prisma.plan.upsert({
    where: { name: 'Professional' },
    create: { name: 'Professional', themePreset: 'professional', features: PROFESSIONAL_FEATURES, isActive: true },
    update: { themePreset: 'professional', features: PROFESSIONAL_FEATURES, isActive: true },
  });

  const subscription = await prisma.subscription.upsert({
    where: { id: (await prisma.subscription.findFirst({ where: { tenantId }, orderBy: { startedAt: 'desc' } }))?.id ?? '00000000-0000-0000-0000-000000000000' },
    create: { tenantId: tenant.id, planId: plan.id, status: 'active', startedAt: now, endsAt: null, graceUntil: null },
    update: { planId: plan.id, status: 'active', startedAt: now, endsAt: null, graceUntil: null },
  });

  for (const [key, value] of Object.entries(PROFESSIONAL_FEATURES)) {
    await prisma.entitlement.upsert({
      where: { subscriptionId_key: { subscriptionId: subscription.id, key } },
      create: { subscriptionId: subscription.id, key, value, source: 'plan' },
      update: { value, source: 'plan' },
    });
  }

  const tenantEmail = process.env.TENANT_ADMIN_EMAIL ?? DEFAULT_TENANT_EMAIL;
  const tenantUser = await upsertUser({
    email: tenantEmail, password: credential('TENANT_ADMIN_PASSWORD', DEFAULT_TENANT_PASSWORD), accountType: 'TENANT',
    tenantId: tenant.id, companyId: company.id, roleIds: [tenantAdminRole], adminLevel: 'TENANT_ADMIN',
    firstName: 'Demo', lastName: 'Admin', jobTitle: 'Tenant Administrator', phone: '+91-90000-00002',
    employeeId: 'DEMO-ADMIN-001', departmentId: department.id, locationId: location.id,
  });

  await prisma.tenant.update({ where: { id: tenant.id }, data: { primaryUserId: tenantUser.id, primaryEmail: tenantEmail } });

  // System administrators still use the same tenant/company foreign-key scope; accountType/adminLevel controls platform privileges.
  await upsertUser({
    email: process.env.SYSTEM_ADMIN_EMAIL ?? DEFAULT_SYSTEM_EMAIL,
    password: credential('SYSTEM_ADMIN_PASSWORD', DEFAULT_SYSTEM_PASSWORD), accountType: 'SYSTEM',
    tenantId: tenant.id, companyId: company.id, roleIds: [platformAdminRole], adminLevel: 'PLATFORM_ADMIN',
    firstName: 'System', lastName: 'Administrator', jobTitle: 'Platform Administrator', phone: '+91-90000-00000',
  });

  const assetTypes = [
    ['Laptop', 'LAP'], ['Desktop', 'DSK'], ['Monitor', 'MON'], ['Mobile', 'MOB'], ['Network Device', 'NET'],
  ];
  for (const [name, prefix] of assetTypes) {
    await prisma.assetType.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      create: { companyId: company.id, name, prefix, separator: '-', padding: 6, nextSequence: 1 },
      update: { prefix, separator: '-', padding: 6 },
    });
  }

  const vendor = await prisma.vendor.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Demo IT Supplies' } },
    create: { companyId: company.id, name: 'Demo IT Supplies', contact: 'sales@demo.local' },
    update: { contact: 'sales@demo.local' },
  });

  const laptopType = await prisma.assetType.findUnique({ where: { companyId_name: { companyId: company.id, name: 'Laptop' } } });
  if (!laptopType) throw new Error('Laptop asset type was not seeded');
  await prisma.asset.upsert({
    where: { companyId_assetNumber: { companyId: company.id, assetNumber: 'LAP-000001' } },
    create: { tenantId: tenant.id, companyId: company.id, assetTypeId: laptopType.id, assetNumber: 'LAP-000001', serialNumber: 'DEMO-LAP-001', model: 'ThinkPad T14 Gen 5', status: 'IN_STOCK', condition: 'GOOD', locationId: location.id, departmentId: department.id, vendorId: vendor.id, customFields: {} },
    update: { assetTypeId: laptopType.id, serialNumber: 'DEMO-LAP-001', model: 'ThinkPad T14 Gen 5', status: 'IN_STOCK', condition: 'GOOD', locationId: location.id, departmentId: department.id, vendorId: vendor.id, customFields: {} },
  });

  console.log('PostgreSQL seed complete.');
  console.log(`Tenant login: ${tenantEmail}`);
  console.log(`System login: ${process.env.SYSTEM_ADMIN_EMAIL ?? DEFAULT_SYSTEM_EMAIL}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
