import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Resource:action model per architecture doc §6 — extend this list as
// modules are built out; nothing in application code should hardcode
// permission strings outside this seed + the @RequirePermission call sites.
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
  'platform:manage_tenants', // platform namespace — never assigned to tenant roles
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
  const permissionRows = await Promise.all(
    PERMISSIONS.map((key) =>
      prisma.permission.upsert({ where: { key }, update: {}, create: { key } }),
    ),
  );
  const permByKey = Object.fromEntries(permissionRows.map((p) => [p.key, p]));

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: { name: 'Demo Tenant', slug: 'demo' },
  });

  const company = await prisma.company.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'DEMO' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Demo Company', code: 'DEMO' },
  });

  for (const [roleName, perms] of Object.entries(SYSTEM_ROLES)) {
    const role = await prisma.role.upsert({
      where: { id: `${tenant.id}-${roleName}` }, // deterministic id for idempotent seeding
      update: {},
      create: {
        id: `${tenant.id}-${roleName}`,
        tenantId: tenant.id,
        companyId: roleName === 'Platform Admin' ? null : company.id,
        name: roleName,
        isSystem: true,
      },
    });
    for (const permKey of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permByKey[permKey].id } },
        update: {},
        create: { roleId: role.id, permissionId: permByKey[permKey].id },
      });
    }
  }

  const adminPasswordHash = await argon2.hash('ChangeMe123!', { type: argon2.argon2id });
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.local' },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: company.id,
      email: 'admin@demo.local',
      passwordHash: adminPasswordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      forcePasswordReset: true, // seeded credential — must be rotated
    },
  });

  const tenantAdminRole = await prisma.role.findUniqueOrThrow({
    where: { id: `${tenant.id}-Tenant Admin` },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: tenantAdminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: tenantAdminRole.id },
  });

  console.log('Seed complete. Demo login: admin@demo.local / ChangeMe123! (must be rotated).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
