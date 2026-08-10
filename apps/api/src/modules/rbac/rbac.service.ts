import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';

@Injectable()
export class RbacService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) {
    super();
  }

  async listPermissions() {
    // Static catalog — not tenant-scoped, every tenant sees the same
    // available permission set (architecture doc §6).
    const docs = await this.db.permission.find().sort({ key: 1 }).lean();
    return toDtoArray(docs);
  }

  async listRoles(auth: AuthContext) {
    const docs = await this.db.role.find(this.scope(auth)).lean();
    return toDtoArray(docs);
  }

  async createRole(auth: AuthContext, name: string, permissionKeys: string[]) {
    // Custom, tenant-defined roles (master prompt §4/§67 — "not
    // hardcoded"). System roles are seeded separately with isSystem=true
    // and are not editable through this path.
    const perms = await this.db.permission
      .find({ key: { $in: permissionKeys } })
      .lean();

    const doc = await this.db.role.create({
      tenantId: auth.tenantId,
      companyId: auth.crossCompany ? null : auth.companyId,
      name,
      isSystem: false,
      // Denormalized role->permission refs (MongoDB has no join tables)
      permissions: perms.map((p) => ({
        permissionId: String(p._id),
        permissionKey: p.key,
      })),
    });
    return toDto(doc.toObject());
  }

  async assignRole(auth: AuthContext, userId: string, roleId: string) {
    if (!Types.ObjectId.isValid(roleId) || !Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid roleId or userId');
    }

    const role = await this.db.role.findOne({ _id: roleId, ...this.scope(auth) }).lean();
    if (!role) throw new NotFoundException('Role not found in your scope');

    // Global/static system roles may be assigned across companies within
    // the tenant, but never across tenants. Tenant/company roles must
    // match the caller's company when the caller is company-scoped.
    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth) }).lean();
    if (!user) throw new NotFoundException('User not found in your scope');

    if (!auth.crossCompany && role.companyId !== auth.companyId) {
      throw new ForbiddenException('Role out of scope for this user');
    }

    const doc = await this.db.user.findOneAndUpdate(
      { _id: userId, ...this.scope(auth), roleIds: { $ne: roleId } },
      { $push: { roleIds: roleId } },
      { new: true },
    ).lean();
    if (!doc) throw new Error('Role already assigned');
    return toDto(doc);
  }
}
