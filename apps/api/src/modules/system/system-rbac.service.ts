import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class SystemRbacService {
  constructor(private readonly prisma: PrismaService) {}

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
}
