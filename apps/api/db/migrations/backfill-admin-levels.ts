import '../../src/bootstrap-dns';
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { UserAdminLevel } from '../../src/models/user.schemas';

loadEnv({ path: resolve(__dirname, '../../../../.env') });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing required environment variable: MONGODB_URI');
  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    const db = connection.db;
    if (!db) throw new Error('Mongo connection failed');

    const roles = db.collection('roles');
    const users = db.collection('users');

    console.log('[ADMIN LEVELS] Applying Tenant Admin and Employee levels...');

    // Tenant Admin is tenant-wide by definition; Company Admin remains company-scoped.
    const tenantAdminRoles = await roles.find({ name: 'Tenant Admin' }).toArray();
    const tenantAdminRoleIds = tenantAdminRoles.map((role) => String(role._id));
    if (tenantAdminRoleIds.length) {
      await roles.updateMany(
        { _id: { $in: tenantAdminRoles.map((role) => role._id) } },
        { $set: { companyId: null, updatedAt: new Date() } },
      );
      await users.updateMany(
        { accountType: 'TENANT', roleIds: { $in: tenantAdminRoleIds } },
        { $set: { adminLevel: UserAdminLevel.TENANT_ADMIN, updatedAt: new Date() } },
      );
    }

    // Existing tenant users without the field are normal employees unless promoted above.
    await users.updateMany(
      { accountType: 'TENANT', adminLevel: { $exists: false } },
      { $set: { adminLevel: UserAdminLevel.EMPLOYEE, updatedAt: new Date() } },
    );

    const tenantAdminUsers = await users.countDocuments({ accountType: 'TENANT', adminLevel: UserAdminLevel.TENANT_ADMIN, isActive: true });
    const employeeUsers = await users.countDocuments({ accountType: 'TENANT', adminLevel: UserAdminLevel.EMPLOYEE, isActive: true });
    console.log(`[ADMIN LEVELS] Active Tenant Admins: ${tenantAdminUsers}`);
    console.log(`[ADMIN LEVELS] Active Employees: ${employeeUsers}`);
    console.log(`[ADMIN LEVELS] Complete. Tenant Admin roles normalized: ${tenantAdminRoleIds.length}`);
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
