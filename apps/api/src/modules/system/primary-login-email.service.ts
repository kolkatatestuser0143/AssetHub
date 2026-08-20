import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PrimaryLoginEmailService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async change(tenantId: string, email: string, actorUserId?: string) {
    const normalized = email.trim().toLowerCase();
    if (!/^[0-9a-f-]{36}$/i.test(tenantId)) throw new BadRequestException('Invalid organization id');
    if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new BadRequestException('A valid email address is required');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Organization not found');

    const primaryUser = tenant.primaryUserId
      ? await this.prisma.user.findFirst({ where: { id: tenant.primaryUserId, tenantId, accountType: 'TENANT' } })
      : await this.prisma.user.findFirst({ where: { tenantId, accountType: 'TENANT' }, orderBy: { createdAt: 'asc' } });
    if (!primaryUser) throw new NotFoundException('Primary organization administrator not found');

    if (!tenant.primaryUserId) {
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { primaryUserId: primaryUser.id, primaryEmail: primaryUser.email.toLowerCase() } });
    }

    if (primaryUser.email.toLowerCase() === normalized && (tenant.primaryEmail ?? '').toLowerCase() === normalized) return { tenantId, email: normalized, changed: false };
    const existing = await this.prisma.user.findFirst({ where: { email: normalized, id: { not: primaryUser.id } } });
    if (existing) throw new ConflictException('Email is already registered');

    const oldEmail = primaryUser.email;
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({ where: { id: primaryUser.id, tenantId, accountType: 'TENANT' }, data: { email: normalized, updatedAt: now, authVersion: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('Primary login identity changed concurrently');
      await tx.tenant.update({ where: { id: tenantId }, data: { primaryUserId: primaryUser.id, primaryEmail: normalized, updatedAt: now } });
      await tx.session.updateMany({ where: { userId: primaryUser.id, revokedAt: null }, data: { revokedAt: now, revokedReason: 'platform_primary_email_changed' } });
    });

    await this.audit.record({ tenantId, actorUserId, action: 'tenant.primary_login_email_changed', targetType: 'user', targetId: primaryUser.id, metadata: { oldEmail, newEmail: normalized } });
    return { tenantId, email: normalized, changed: true, sessionsRevoked: true };
  }
}
