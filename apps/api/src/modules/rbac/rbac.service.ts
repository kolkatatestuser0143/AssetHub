import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';
import { EntitlementService } from '../billing/entitlement.service';

@Injectable()
export class RbacService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService, private readonly entitlements: EntitlementService) { super(); }

  async listPermissions() {
    const docs = await this.db.permission.find().sort({ key: 1 }).lean();
    return toDtoArray(docs);
  }

  async listRoles(auth: AuthContext) {
    const docs = await this.db.role.find(this.scope(auth)).lean();
    return toDtoArray(docs);
  }

  async createRole(auth: AuthContext, name: string, permissionKeys: string[]) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_roles_enabled');
    const perms = await this.db.permission.find({ key: { $in: permissionKeys } }).lean();
    const doc = await this.db.role.create({ tenantId: auth.tenantId, companyId: auth.crossCompany ? null : auth.companyId, name, isSystem: false, permissions: perms.map((p) => ({ permissionId: String(p._id), permissionKey: p.key })) });
    return toDto(doc.toObject());
  }

  async assignRole(auth: AuthContext, userId: string, roleId: string) {
    if (!Types.ObjectId.isValid(roleId) || !Types.ObjectId.isValid(userId)) throw new Error('Invalid roleId or userId');
    const role = await this.db.role.findOne({ _id: roleId, ...this.scope(auth) }).lean();
    if (!role) throw new NotFoundException('Role not found in your scope');
    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth) }).lean();
    if (!user) throw new NotFoundException('User not found in your scope');
    if (!auth.crossCompany && role.companyId !== auth.companyId) throw new ForbiddenException('Role out of scope for this user');
    const doc = await this.db.user.findOneAndUpdate({ _id: userId, ...this.scope(auth), roleIds: { $ne: roleId } }, { $push: { roleIds: roleId } }, { new: true }).lean();
    if (!doc) throw new Error('Role already assigned');
    return toDto(doc);
  }

  async unassignRole(auth: AuthContext, userId: string, roleId: string) {
    if (!Types.ObjectId.isValid(roleId) || !Types.ObjectId.isValid(userId)) throw new NotFoundException('User or role not found');
    const role = await this.db.role.findOne({ _id: roleId, ...this.scope(auth) }).lean();
    if (!role) throw new NotFoundException('Role not found in your scope');
    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!user) throw new NotFoundException('User not found in your scope');
    if (!auth.crossCompany && role.companyId !== auth.companyId) throw new ForbiddenException('Role out of scope for this user');
    const doc = await this.db.user.findOneAndUpdate({ _id: userId, ...this.scope(auth), roleIds: roleId }, { $pull: { roleIds: roleId } }, { new: true }).lean();
    if (!doc) throw new NotFoundException('Role is not assigned to this user');
    return toDto(doc);
  }
}
