import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissions() {
    // Static catalog — not tenant-scoped, every tenant sees the same
    // available permission set (architecture doc §6).
    return this.prisma.permission.findMany();
  }

  async listRoles(auth: AuthContext) {
    return this.prisma.role.findMany({
      where: auth.crossCompany
        ? { tenantId: auth.tenantId }
        : { tenantId: auth.tenantId, companyId: auth.companyId },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async createRole(auth: AuthContext, name: string, permissionKeys: string[]) {
    // Custom, tenant-defined roles (master prompt §4/§67 — "not
    // hardcoded"). System roles are seeded separately with isSystem=true
    // and are not editable through this path.
    const perms = await this.prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
    return this.prisma.role.create({
      data: {
        tenantId: auth.tenantId,
        companyId: auth.crossCompany ? null : auth.companyId,
        name,
        isSystem: false,
        permissions: { create: perms.map((p) => ({ permissionId: p.id })) },
      },
    });
  }

  async assignRole(userId: string, roleId: string) {
    return this.prisma.userRole.create({ data: { userId, roleId } });
  }
}
