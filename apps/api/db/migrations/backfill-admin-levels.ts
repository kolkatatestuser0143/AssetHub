import '../../src/bootstrap-dns';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

loadEnv({ path: resolve(__dirname, '../../../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('[ADMIN LEVELS] Applying Tenant Admin and Employee levels...');

  const tenantAdminRoles = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM roles WHERE name = 'Tenant Admin'`,
  );
  const tenantAdminRoleIds = tenantAdminRoles.map((role) => role.id);

  if (tenantAdminRoleIds.length) {
    await prisma.$executeRawUnsafe(
      `UPDATE roles SET company_id = NULL, updated_at = now() WHERE id = ANY($1::uuid[])`,
      tenantAdminRoleIds,
    );

    await prisma.$executeRawUnsafe(
      `UPDATE users
       SET admin_level = 'TENANT_ADMIN', updated_at = now()
       WHERE account_type = 'TENANT'
         AND role_ids && $1::text[]`,
      tenantAdminRoleIds,
    );
  }

  await prisma.$executeRawUnsafe(
    `UPDATE users
     SET admin_level = 'EMPLOYEE', updated_at = now()
     WHERE account_type = 'TENANT'
       AND (admin_level IS NULL OR admin_level = '')`,
  );

  const tenantAdminUsers = await prisma.user.count({
    where: { accountType: 'TENANT', adminLevel: 'TENANT_ADMIN', isActive: true },
  });
  const employeeUsers = await prisma.user.count({
    where: { accountType: 'TENANT', adminLevel: 'EMPLOYEE', isActive: true },
  });

  console.log(`[ADMIN LEVELS] Active Tenant Admins: ${tenantAdminUsers}`);
  console.log(`[ADMIN LEVELS] Active Employees: ${employeeUsers}`);
  console.log(`[ADMIN LEVELS] Complete. Tenant Admin roles normalized: ${tenantAdminRoleIds.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
