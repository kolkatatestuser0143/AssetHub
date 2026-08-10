import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { toDto, toDtoArray } from '../../common/mongoose.utils';

@Injectable()
export class RbacService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async listPermissions() {
    // Static catalog — not tenant-scoped, every tenant sees the same
    // available permission set (architecture doc §6).
    const docs = await this.db.permission.find().sort({ key: 1 }).lean();
    return toDtoArray(docs);
  }

  async listRoles(auth: AuthContext) {
    const filter = auth.crossCompany
      ? { tenantId: auth.tenantId }
      : { tenantId: auth.tenantId, companyId: auth.companyId };
    const docs = await this.db.role.find(filter).lean();
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

  async assignRole(userId: string, roleId: string) {
    if (!Types.ObjectId.isValid(roleId) || !Types.ObjectId.isValid(userId)) {
      // callers pass raw ids; leave validation to the caller's service.
      // We still guard against malformed ids to avoid CastErrors later.
      throw new Error('Invalid roleId or userId');
    }
    // Idempotent: pushes the role only if not already present.
    const doc = await this.db.user.findOneAndUpdate(
      { _id: userId, roleIds: { $ne: roleId } },
      { $push: { roleIds: roleId } },
      { new: true },
    ).lean();
    if (!doc) throw new Error('User not found or role already assigned');
    return toDto(doc);
  }
}
