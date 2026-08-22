import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PLATFORM_TENANT_ID = process.env.SYSTEM_RBAC_TENANT_ID;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Platform Admin': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:tenants:manage','platform:users:read','platform:users:manage','platform:roles:read','platform:roles:manage','platform:billing:read','platform:billing:manage','platform:audit:read','platform:health:read','platform:analytics:read','platform:settings:read','platform:settings:manage','platform:support:read','platform:support:manage'],
  'Sales Manager': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:tenants:manage','platform:billing:read','platform:analytics:read'],
  Sales: ['platform:console:access','platform:overview:read','platform:tenants:read','platform:billing:read'],
  'Billing Manager': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:billing:read','platform:billing:manage','platform:analytics:read'],
  'Support Manager': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:users:read','platform:support:read','platform:support:manage','platform:audit:read'],
  'Support Agent': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:users:read','platform:support:read'],
  'Security Auditor': ['platform:console:access','platform:overview:read','platform:users:read','platform:roles:read','platform:audit:read','platform:health:read'],
  'Operations Manager': ['platform:console:access','platform:overview:read','platform:tenants:read','platform:users:read','platform:roles:read','platform:health:read','platform:analytics:read','platform:billing:read'],
};

async function main() {
  const tenant = PLATFORM_TENANT_ID
    ? await prisma.tenant.findUnique({ where: { id: PLATFORM_TENANT_ID } })
    : await prisma.tenant.findUnique({ where: { slug: 'demo' } });

  if (!tenant) throw new Error(PLATFORM_TENANT_ID ? `System RBAC tenant ${PLATFORM_TENANT_ID} does not exist` : 'Demo tenant does not exist; run db:seed first');

  const allPermissions = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];
  for (const key of allPermissions) {
    await prisma.$executeRawUnsafe(`INSERT INTO permissions (key, name) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET name=EXCLUDED.name`, key, key);
  }

  for (const [name, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM roles WHERE tenant_id=$1::uuid AND company_id IS NULL AND name=$2 LIMIT 1`,
      tenant.id,
      name,
    );

    let roleId: string;
    if (existing[0]?.id) {
      roleId = String(existing[0].id);
      await prisma.$executeRawUnsafe(
        `UPDATE roles SET is_system=true, updated_at=now() WHERE id=$1::uuid`,
        roleId,
      );
    } else {
      const created = await prisma.$queryRawUnsafe<any[]>(
        `INSERT INTO roles (tenant_id, company_id, name, is_system)
         VALUES ($1::uuid,NULL,$2,true)
         RETURNING id`,
        tenant.id,
        name,
      );
      if (!created[0]?.id) throw new Error(`Failed to create platform role: ${name}`);
      roleId = String(created[0].id);
    }

    await prisma.$executeRawUnsafe(`DELETE FROM role_permissions WHERE role_id=$1::uuid`, roleId);
    for (const key of keys) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1::uuid,id FROM permissions WHERE key=$2
         ON CONFLICT DO NOTHING`,
        roleId,
        key,
      );
    }
  }

  console.log(`Seeded ${Object.keys(ROLE_PERMISSIONS).length} platform roles under tenant scope ${tenant.id}.`);
}

main().catch(error => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
