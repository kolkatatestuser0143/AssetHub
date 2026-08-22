import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class SystemRbacService {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(actorUserId?: string) {
    if (!actorUserId) throw new BadRequestException('System administrator context is required');
    const user = await this.prisma.user.findFirst({ where: { id: actorUserId, accountType: 'SYSTEM', isActive: true }, select: { id: true, tenantId: true, companyId: true } });
    if (!user?.tenantId || !user.companyId) throw new NotFoundException('Platform administration scope was not found');
    return user;
  }

  private normalizeIds(values: string[]) {
    const ids = [...new Set((values ?? []).map(String))];
    if (ids.some((id) => !UUID_RE.test(id))) throw new BadRequestException('Invalid role id');
    return ids;
  }

  private async platformPermissions(tx: any, keys: string[]) {
    const clean = [...new Set((keys ?? []).map((key) => String(key).trim()).filter(Boolean))];
    if (clean.some((key) => !key.startsWith('platform:'))) throw new BadRequestException('System roles may only contain platform permissions');
    if (!clean.length) throw new BadRequestException('Select at least one platform permission');
    const permissions = await tx.$queryRawUnsafe<Array<{ id: string; key: string }>>(`SELECT id::text AS id, key FROM permissions WHERE key = ANY($1::text[]) AND key LIKE 'platform:%'`, clean);
    if (permissions.length !== clean.length) throw new BadRequestException('One or more selected platform permissions do not exist');
    return { keys: clean, permissions };
  }

  async listPlatformPermissions() {
    return this.prisma.$queryRawUnsafe<any[]>(`SELECT id::text AS id, key, name, description FROM permissions WHERE key LIKE 'platform:%' ORDER BY key ASC`);
  }

  async createPlatformRole(name: string, permissionKeys: string[], actorUserId?: string) {
    const actor = await this.actor(actorUserId);
    const cleanName = String(name ?? '').trim();
    if (cleanName.length < 2) throw new BadRequestException('Role name must contain at least 2 characters');
    return this.prisma.$transaction(async (tx) => {
      const { keys, permissions } = await this.platformPermissions(tx, permissionKeys);
      let rows: any[];
      try {
        rows = await tx.$queryRawUnsafe(`INSERT INTO roles (tenant_id, company_id, name, is_system) VALUES ($1::uuid, NULL, $2, false) RETURNING id::text AS id, name, is_system AS "isSystem"`, actor.tenantId, cleanName);
      } catch (error: any) {
        if (error?.code === '23505') throw new ConflictException('A platform role with this name already exists');
        throw error;
      }
      const created = rows[0];
      for (const permission of permissions) await tx.$executeRawUnsafe(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`, created.id, permission.id);
      await tx.$executeRawUnsafe(`INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at) VALUES ($1::uuid,'platform.role_created','role',$2::uuid,$3::jsonb,'success',NOW())`, actor.id, created.id, JSON.stringify({ name: cleanName, permissionKeys: keys }));
      return { ...created, permissions: permissions.map((p) => ({ permissionId: p.id, permissionKey: p.key })) };
    });
  }

  async updatePlatformRole(roleId: string, name: string, permissionKeys: string[], actorUserId?: string) {
    const actor = await this.actor(actorUserId);
    if (!UUID_RE.test(roleId)) throw new BadRequestException('Invalid role id');
    const cleanName = String(name ?? '').trim();
    if (cleanName.length < 2) throw new BadRequestException('Role name must contain at least 2 characters');
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.$queryRawUnsafe<any[]>(`SELECT id::text AS id, name, is_system AS "isSystem" FROM roles WHERE id=$1::uuid AND tenant_id=$2::uuid AND company_id IS NULL`, roleId, actor.tenantId);
      if (!role[0]) throw new NotFoundException('Platform role not found');
      if (role[0].isSystem) throw new BadRequestException('Built-in platform roles cannot be modified');
      const { keys, permissions } = await this.platformPermissions(tx, permissionKeys);
      try { await tx.$executeRawUnsafe(`UPDATE roles SET name=$1 WHERE id=$2::uuid`, cleanName, roleId); }
      catch (error: any) { if (error?.code === '23505') throw new ConflictException('A platform role with this name already exists'); throw error; }
      await tx.$executeRawUnsafe(`DELETE FROM role_permissions WHERE role_id=$1::uuid`, roleId);
      for (const permission of permissions) await tx.$executeRawUnsafe(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`, roleId, permission.id);
      await tx.$executeRawUnsafe(`INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at) VALUES ($1::uuid,'platform.role_updated','role',$2::uuid,$3::jsonb,'success',NOW())`, actor.id, roleId, JSON.stringify({ name: cleanName, permissionKeys: keys }));
      return { id: roleId, name: cleanName, isSystem: false, permissions: permissions.map((p) => ({ permissionId: p.id, permissionKey: p.key })) };
    });
  }

  async deletePlatformRole(roleId: string, actorUserId?: string) {
    const actor = await this.actor(actorUserId);
    if (!UUID_RE.test(roleId)) throw new BadRequestException('Invalid role id');
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.$queryRawUnsafe<any[]>(`SELECT id::text AS id, name, is_system AS "isSystem" FROM roles WHERE id=$1::uuid AND tenant_id=$2::uuid AND company_id IS NULL`, roleId, actor.tenantId);
      if (!role[0]) throw new NotFoundException('Platform role not found');
      if (role[0].isSystem) throw new BadRequestException('Built-in platform roles cannot be deleted');
      const assigned = await tx.user.findFirst({ where: { accountType: 'SYSTEM', tenantId: actor.tenantId, roleIds: { has: roleId } }, select: { id: true } });
      if (assigned) throw new ConflictException('Role is assigned to one or more platform users. Remove those assignments before deleting it.');
      await tx.$executeRawUnsafe(`DELETE FROM role_permissions WHERE role_id=$1::uuid`, roleId);
      await tx.$executeRawUnsafe(`DELETE FROM roles WHERE id=$1::uuid`, roleId);
      await tx.$executeRawUnsafe(`INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at) VALUES ($1::uuid,'platform.role_deleted','role',$2::uuid,$3::jsonb,'success',NOW())`, actor.id, roleId, JSON.stringify({ name: role[0].name }));
      return { ok: true, roleId };
    });
  }

  async createPlatformUser(input: { email: string; firstName: string; lastName: string; roleIds: string[] }, actorUserId?: string) {
    const actor = await this.actor(actorUserId);
    const email = String(input.email ?? '').trim().toLowerCase();
    const firstName = String(input.firstName ?? '').trim();
    const lastName = String(input.lastName ?? '').trim();
    const normalized = this.normalizeIds(input.roleIds ?? []);
    if (!email) throw new BadRequestException('Email is required');
    if (!firstName || !lastName) throw new BadRequestException('First name and last name are required');
    if (!normalized.length) throw new BadRequestException('Select at least one platform role');
    return this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.user.findFirst({ where: { tenantId: actor.tenantId, email }, select: { id: true } });
      if (duplicate) throw new ConflictException('A platform user with this email already exists');
      const roles: any[] = await tx.$queryRawUnsafe(`SELECT r.id::text AS id, EXISTS (SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=r.id AND p.key='platform:console:access') AS "hasConsoleAccess" FROM roles r WHERE r.id=ANY($1::uuid[]) AND r.tenant_id=$2::uuid AND r.company_id IS NULL AND EXISTS (SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=r.id AND p.key LIKE 'platform:%')`, normalized, actor.tenantId);
      if (roles.length !== normalized.length) throw new BadRequestException('One or more roles are not platform roles');
      if (!roles.some((r) => r.hasConsoleAccess)) throw new BadRequestException('At least one selected role must grant platform console access');
      const temporaryPassword = `Ah-${crypto.randomBytes(9).toString('base64url')}`;
      const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });
      const user = await tx.user.create({ data: { tenantId: actor.tenantId, companyId: actor.companyId, accountType: 'SYSTEM', adminLevel: 'PLATFORM_ADMIN', email, passwordHash, firstName, lastName, jobTitle: 'Platform Administrator', roleIds: normalized, forcePasswordReset: true, isActive: true }, select: { id: true, email: true, firstName: true, lastName: true, isActive: true, roleIds: true, forcePasswordReset: true } });
      await tx.$executeRawUnsafe(`INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at) VALUES ($1::uuid,'platform.user_created','user',$2::uuid,$3::jsonb,'success',NOW())`, actor.id, user.id, JSON.stringify({ email, roleIds: normalized }));
      return { ...user, temporaryPassword };
    });
  }

  async updatePlatformUser(userId: string, input: { email?: string; firstName?: string; lastName?: string }, actorUserId?: string) {
    const actor = await this.actor(actorUserId);
    if (!UUID_RE.test(userId)) throw new BadRequestException('Invalid user id');
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId: actor.tenantId, accountType: 'SYSTEM' } });
    if (!user) throw new NotFoundException('Platform user not found');
    const email = input.email === undefined ? undefined : String(input.email).trim().toLowerCase();
    const firstName = input.firstName === undefined ? undefined : String(input.firstName).trim();
    const lastName = input.lastName === undefined ? undefined : String(input.lastName).trim();
    if (email !== undefined && !email) throw new BadRequestException('Email is required');
    if (firstName !== undefined && !firstName) throw new BadRequestException('First name is required');
    if (lastName !== undefined && !lastName) throw new BadRequestException('Last name is required');
    if (email && email !== user.email) {
      const duplicate = await this.prisma.user.findFirst({ where: { tenantId: actor.tenantId, email, NOT: { id: userId } }, select: { id: true } });
      if (duplicate) throw new ConflictException('A platform user with this email already exists');
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { ...(email !== undefined ? { email } : {}), ...(firstName !== undefined ? { firstName } : {}), ...(lastName !== undefined ? { lastName } : {}) }, select: { id: true, email: true, firstName: true, lastName: true, isActive: true, roleIds: true, forcePasswordReset: true } });
    await this.prisma.$executeRawUnsafe(`INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at) VALUES ($1::uuid,'platform.user_updated','user',$2::uuid,$3::jsonb,'success',NOW())`, actor.id, userId, JSON.stringify({ changed: Object.keys(input) }));
    return updated;
  }

  async setPlatformUserStatus(userId: string, active: boolean, actorUserId?: string) {
    const actor = await this.actor(actorUserId);
    if (!UUID_RE.test(userId)) throw new BadRequestException('Invalid user id');
    if (userId === actor.id && !active) throw new BadRequestException('You cannot deactivate your own platform account');
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId: actor.tenantId, accountType: 'SYSTEM' }, select: { id: true } });
    if (!user) throw new NotFoundException('Platform user not found');
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { isActive: active, authVersion: { increment: 1 } } });
      if (!active) await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now, revokedReason: 'platform_user_deactivated' } });
      await tx.$executeRawUnsafe(`INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at) VALUES ($1::uuid,$2,'user',$3::uuid,$4::jsonb,'success',NOW())`, actor.id, active ? 'platform.user_activated' : 'platform.user_deactivated', userId, JSON.stringify({}));
    });
    return { ok: true, userId, isActive: active };
  }

  async resetPlatformUserPassword(userId: string, actorUserId?: string) {
    const actor = await this.actor(actorUserId);
    if (!UUID_RE.test(userId)) throw new BadRequestException('Invalid user id');
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId: actor.tenantId, accountType: 'SYSTEM' }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException('Platform user not found');
    const temporaryPassword = `Ah-${crypto.randomBytes(9).toString('base64url')}`;
    const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash, forcePasswordReset: true, accessTokenHash: null, accessTokenIssuedAt: null, updatedAt: now, authVersion: { increment: 1 } } });
      await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now, revokedReason: 'platform_password_reset' } });
      await tx.$executeRawUnsafe(`INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at) VALUES ($1::uuid,'platform.password_reset','user',$2::uuid,$3::jsonb,'success',NOW())`, actor.id, userId, JSON.stringify({ email: user.email }));
    });
    return { userId, email: user.email, temporaryPassword, mustChangePassword: true };
  }

  async setPlatformUserRoles(userId: string, roleIds: string[], actorUserId?: string) {
    const actor = await this.actor(actorUserId);
    if (!UUID_RE.test(userId)) throw new BadRequestException('Invalid user id');
    const normalized = this.normalizeIds(roleIds ?? []);
    if (!normalized.length) throw new BadRequestException('Select at least one platform role');
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId: actor.tenantId, accountType: 'SYSTEM' }, select: { id: true } });
    if (!user) throw new NotFoundException('Platform user not found');
    const roles: any[] = await this.prisma.$queryRawUnsafe(`SELECT r.id::text AS id, EXISTS (SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=r.id AND p.key='platform:console:access') AS "hasConsoleAccess" FROM roles r WHERE r.id=ANY($1::uuid[]) AND r.tenant_id=$2::uuid AND r.company_id IS NULL AND EXISTS (SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=r.id AND p.key LIKE 'platform:%')`, normalized, actor.tenantId);
    if (roles.length !== normalized.length) throw new BadRequestException('One or more roles are not platform roles');
    if (!roles.some((r) => r.hasConsoleAccess)) throw new BadRequestException('At least one selected role must grant platform console access');
    await this.prisma.user.update({ where: { id: user.id }, data: { roleIds: normalized, authVersion: { increment: 1 } } });
    await this.prisma.$executeRawUnsafe(`INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at) VALUES ($1::uuid,'platform.user_roles_changed','user',$2::uuid,$3::jsonb,'success',NOW())`, actor.id, userId, JSON.stringify({ roleIds: normalized }));
    return { ok: true, userId, roleIds: normalized };
  }
}
