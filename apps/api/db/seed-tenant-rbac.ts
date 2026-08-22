import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ROLES: Record<string, string[]> = {
  Employee: ['asset:read', 'company:read', 'user:read'],
  'Asset Manager': ['asset:read', 'asset:write', 'asset:assign', 'asset:transfer', 'company:read', 'report:read'],
  'IT Manager': ['asset:read', 'asset:write', 'asset:delete', 'asset:assign', 'asset:transfer', 'user:read', 'user:write', 'company:read', 'company:write', 'vendor:read', 'vendor:write', 'report:read', 'report:write', 'audit:read'],
  'Company Admin': ['asset:read', 'asset:write', 'asset:assign', 'asset:transfer', 'user:read', 'user:write', 'company:read', 'company:write', 'vendor:read', 'vendor:write', 'report:read', 'report:write', 'audit:read', 'role:read'],
  'Tenant Admin': ['role:read', 'role:write', 'asset:read', 'asset:write', 'asset:delete', 'user:read', 'user:write', 'vendor:read', 'vendor:write', 'report:read', 'report:write', 'audit:read', 'company:read', 'company:write', 'billing:read', 'identity_provider:read', 'identity_provider:write', 'scim:manage'],
  Auditor: ['asset:read', 'user:read', 'company:read', 'vendor:read', 'report:read', 'audit:read'],
};

const PERMISSION_LABELS: Record<string, [string, string]> = {
  'asset:read': ['View Assets', 'View inventory and asset details'],
  'asset:write': ['Manage Assets', 'Create and update assets'],
  'asset:delete': ['Delete Assets', 'Remove assets from inventory'],
  'asset:assign': ['Assign Assets', 'Issue assets to employees'],
  'asset:transfer': ['Transfer Assets', 'Transfer custody or responsibility'],
  'user:read': ['View Users', 'View tenant users and profiles'],
  'user:write': ['Manage Users', 'Create and update tenant users'],
  'company:read': ['View Organization', 'View companies, sites and locations'],
  'company:write': ['Manage Organization', 'Manage companies, sites and locations'],
  'vendor:read': ['View Vendors', 'View vendors and suppliers'],
  'vendor:write': ['Manage Vendors', 'Create and update vendors'],
  'report:read': ['View Reports', 'View reporting and analytics'],
  'report:write': ['Manage Reports', 'Create and manage reports'],
  'audit:read': ['View Audit Logs', 'Review tenant audit activity'],
  'billing:read': ['View Subscription', 'View plan and entitlement information'],
  'role:read': ['View Roles', 'View tenant roles and permissions'],
  'role:write': ['Manage Roles', 'Create and customize tenant roles'],
  'identity_provider:read': ['View Identity Providers', 'View SSO provider configuration'],
  'identity_provider:write': ['Manage Identity Providers', 'Manage SSO provider configuration'],
  'scim:manage': ['Manage SCIM', 'Manage directory provisioning credentials and logs'],
};

async function ensurePermission(key: string) {
  const [name, description] = PERMISSION_LABELS[key] ?? [key, key];
  await prisma.$executeRawUnsafe(
    `INSERT INTO permissions (key, name, description) VALUES ($1,$2,$3)
     ON CONFLICT (key) DO UPDATE SET name=COALESCE(NULLIF(permissions.name,''), EXCLUDED.name), description=COALESCE(NULLIF(permissions.description,''), EXCLUDED.description)`,
    key, name, description,
  );
}

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  if (!tenants.length) throw new Error('No tenants exist; run the base seed first.');

  for (const tenant of tenants) {
    for (const [name, keys] of Object.entries(DEFAULT_ROLES)) {
      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, company_id AS "companyId" FROM roles WHERE tenant_id=$1::uuid AND name=$2 ORDER BY company_id NULLS FIRST LIMIT 1`,
        tenant.id, name,
      );
      const roleId = existing[0]?.id ?? (await prisma.$queryRawUnsafe<any[]>(
        `INSERT INTO roles (tenant_id, company_id, name, is_system) VALUES ($1::uuid,NULL,$2,true) RETURNING id`,
        tenant.id, name,
      ))[0].id;

      await prisma.$executeRawUnsafe(`UPDATE roles SET is_system=true, updated_at=now() WHERE id=$1::uuid`, roleId);
      for (const key of keys) {
        await ensurePermission(key);
        await prisma.$executeRawUnsafe(
          `INSERT INTO role_permissions (role_id, permission_id) SELECT $1::uuid,id FROM permissions WHERE key=$2 ON CONFLICT DO NOTHING`,
          roleId, key,
        );
      }
    }
  }

  console.log(`Seeded default tenant roles for ${tenants.length} tenant(s).`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
