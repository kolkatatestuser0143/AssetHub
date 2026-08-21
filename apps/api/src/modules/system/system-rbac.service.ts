import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class SystemRbacService {
  constructor(private readonly prisma: PrismaService) {}

  private async getPlatformActor(actorUserId: string) {
    const actor = await this.prisma.user.findFirst({
      where: { id: actorUserId, accountType: 'SYSTEM', isActive: true },
      select: { tenantId: true, companyId: true },
    });
    if (!actor?.tenantId || !actor.companyId) throw new NotFoundException('Platform administration scope was not found');
    return actor;
  }

  async listPlatformPermissions() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT id::text AS id, key, name, description
      FROM permissions
      WHERE key LIKE 'platform:%'
      ORDER BY key ASC
    `);
  }

  async createPlatformRole(name: string, permissionKeys: string[], actorUserId?: string) {
    const cleanName = name.trim();
    if (cleanName.length < 2) throw new BadRequestException('Role name must contain at least 2 characters');

    const keys = [...new Set((permissionKeys ?? []).map((key) => String(key).trim()).filter(Boolean))];
    if (keys.some((key) => !key.startsWith('platform:'))) {
      throw new BadRequestException('System roles may only contain platform permissions');
    }
    if (!keys.length) throw new BadRequestException('Select at least one platform permission');
    if (!actorUserId) throw new BadRequestException('System administrator context is required');

    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.user.findFirst({
        where: { id: actorUserId, accountType: 'SYSTEM', isActive: true },
        select: { tenantId: true },
      });
      if (!actor?.tenantId) throw new NotFoundException('Platform administration scope was not found');

      const permissions = await tx.$queryRawUnsafe<Array<{ id: string; key: string }>>(
        `SELECT id::text AS id, key FROM permissions WHERE key = ANY($1::text[]) AND key LIKE 'platform:%'`,
        keys,
      );
      if (permissions.length !== keys.length) {
        throw new BadRequestException('One or more selected platform permissions do not exist');
      }

      let role: Array<{ id: string; name: string; isSystem: boolean }>;
      try {
        role = await tx.$queryRawUnsafe<Array<{ id: string; name: string; isSystem: boolean }>>(
          `INSERT INTO roles (tenant_id, company_id, name, is_system)
           VALUES ($1::uuid, NULL, $2, false)
           RETURNING id::text AS id, name, is_system AS "isSystem"`,
          actor.tenantId,
          cleanName,
        );
      } catch (error: any) {
        if (error?.code === '23505') throw new ConflictException('A platform role with this name already exists');
        throw error;
      }

      const created = role[0];
      for (const permission of permissions) {
        await tx.$executeRawUnsafe(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1::uuid, $2::uuid)
           ON CONFLICT DO NOTHING`,
          created.id,
          permission.id,
        );
      }

      await tx.$executeRawUnsafe(
        `INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at)
         VALUES ($1::uuid, 'platform.role_created', 'role', $2::uuid, $3::jsonb, 'success', NOW())`,
        actorUserId,
        created.id,
        JSON.stringify({ tenantId: actor.tenantId, name: cleanName, permissionKeys: keys }),
      );

      return {
        ...created,
        permissions: permissions.map((permission) => ({ permissionId: permission.id, permissionKey: permission.key })),
      };
    });
  }

  async createPlatformUser(
    input: { email: string; firstName: string; lastName: string; roleIds: string[] },
    actorUserId?: string,
  ) {
    if (!actorUserId) throw new BadRequestException('System administrator context is required');
    const email = String(input.email ?? '').trim().toLowerCase();
    const firstName = String(input.firstName ?? '').trim();
    const lastName = String(input.lastName ?? '').trim();
    const normalized = [...new Set((input.roleIds ?? []).map(String))];
    if (!email) throw new BadRequestException('Email is required');
    if (!firstName || !lastName) throw new BadRequestException('First name and last name are required');
    if (!normalized.length) throw new BadRequestException('Select at least one platform role');
    if (normalized.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
      throw new BadRequestException('Invalid role id');
    }

    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.user.findFirst({
        where: { id: actorUserId, accountType: 'SYSTEM', isActive: true },
        select: { tenantId: true, companyId: true },
      });
      if (!actor?.tenantId || !actor.companyId) throw new NotFoundException('Platform administration scope was not found');

      const duplicate = await tx.user.findFirst({ where: { tenantId: actor.tenantId, email }, select: { id: true } });
      if (duplicate) throw new ConflictException('A platform user with this email already exists');

      const roles: any[] = await tx.$queryRawUnsafe(
        `SELECT r.id::text AS id,
                EXISTS (
                  SELECT 1 FROM role_permissions rp
                  JOIN permissions p ON p.id = rp.permission_id
                  WHERE rp.role_id = r.id AND p.key = 'platform:console:access'
                ) AS "hasConsoleAccess"
         FROM roles r
         WHERE r.id = ANY($1::uuid[])
           AND r.tenant_id = $2::uuid
           AND r.company_id IS NULL
           AND EXISTS (
             SELECT 1 FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = r.id AND p.key LIKE 'platform:%'
           )`,
        normalized,
        actor.tenantId,
      );
      if (roles.length !== normalized.length) throw new BadRequestException('One or more roles are not platform roles');
      if (!roles.some((role) => role.hasConsoleAccess)) throw new BadRequestException('At least one selected role must grant platform console access');

      const temporaryPassword = `Ah-${crypto.randomBytes(9).toString('base64url')}`;
      const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });
      const user = await tx.user.create({
        data: {
          tenantId: actor.tenantId,
          companyId: actor.companyId,
          accountType: 'SYSTEM',
          adminLevel: 'PLATFORM_ADMIN',
          email,
          passwordHash,
          firstName,
          lastName,
          jobTitle: 'Platform Administrator',
          roleIds: normalized,
          forcePasswordReset: true,
          isActive: true,
        },
        select: { id: true, email: true, firstName: true, lastName: true, isActive: true, roleIds: true, forcePasswordReset: true },
      });

      await tx.$executeRawUnsafe(
        `INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at)
         VALUES ($1::uuid, 'platform.user_created', 'user', $2::uuid, $3::jsonb, 'success', NOW())`,
        actorUserId,
        user.id,
        JSON.stringify({ tenantId: actor.tenantId, email, roleIds: normalized }),
      );

      return { ...user, temporaryPassword };
    });
  }

  async setPlatformUserRoles(userId: string, roleIds: string[], actorUserId?: string) {
    if (!actorUserId) throw new BadRequestException('System administrator context is required');
    const normalized = [...new Set((roleIds ?? []).map(String))];
    if (normalized.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
      throw new BadRequestException('Invalid role id');
    }

    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.user.findFirst({
        where: { id: actorUserId, accountType: 'SYSTEM', isActive: true },
        select: { tenantId: true },
      });
      if (!actor?.tenantId) throw new NotFoundException('Platform administration scope was not found');

      const user = await tx.user.findFirst({ where: { id: userId, accountType: 'SYSTEM' } });
      if (!user) throw new NotFoundException('Platform user not found');

      const roles: any[] = normalized.length
        ? await tx.$queryRawUnsafe(
            `SELECT r.id::text AS id,
                    EXISTS (
                      SELECT 1 FROM role_permissions rp
                      JOIN permissions p ON p.id = rp.permission_id
                      WHERE rp.role_id = r.id AND p.key = 'platform:console:access'
                    ) AS "hasConsoleAccess"
             FROM roles r
             WHERE r.id = ANY($1::uuid[])
               AND r.tenant_id = $2::uuid
               AND r.company_id IS NULL
               AND EXISTS (
                 SELECT 1 FROM role_permissions rp
                 JOIN permissions p ON p.id = rp.permission_id
                 WHERE rp.role_id = r.id AND p.key LIKE 'platform:%'
               )`,
            normalized,
            actor.tenantId,
          )
        : [];

      if (roles.length !== normalized.length) throw new BadRequestException('One or more roles are not platform roles');
      if (!roles.some((role) => role.hasConsoleAccess)) throw new BadRequestException('At least one selected role must grant platform console access');

      await tx.user.update({ where: { id: user.id }, data: { roleIds: normalized, authVersion: { increment: 1 } } });
      await tx.$executeRawUnsafe(
        `INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at)
         VALUES ($1::uuid, 'platform.user_roles_changed', 'user', $2::uuid, $3::jsonb, 'success', NOW())`,
        actorUserId,
        userId,
        JSON.stringify({ roleIds: normalized }),
      );

      return { ok: true, userId, roleIds: normalized, actorUserId };
    });
  }
}
