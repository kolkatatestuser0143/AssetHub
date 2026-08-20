import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class SystemSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  private async recordAudit(actorUserId: string | undefined, action: string, targetType: string, targetId: string, metadata: Record<string, unknown>) {
    const safeMetadata = Object.fromEntries(Object.entries(metadata).filter(([key]) => !/password|token|secret|authorization|cookie|refresh|access[_-]?token|private[_-]?key/i.test(key)));
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at)
       VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, NOW())`,
      actorUserId ?? null,
      action,
      targetType,
      targetId,
      JSON.stringify(safeMetadata),
      'success',
    );
  }

  async sessions() {
    const now = new Date();
    const sessions = await this.prisma.session.findMany({
      where: { revokedAt: null, expiresAt: { gt: now }, user: { accountType: 'SYSTEM' } },
      orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
      include: { user: { select: { email: true, firstName: true, lastName: true, isActive: true } } },
    });
    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      email: s.user.email,
      name: `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || s.user.email,
      isActive: s.user.isActive,
      ipAddress: s.ipAddress ?? null,
      userAgent: s.userAgent ?? null,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt ?? s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  async revokeSession(sessionId: string, actorUserId?: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.user.accountType !== 'SYSTEM') throw new NotFoundException('System administrator session not found');
    if (session.revokedAt) return { ok: true, sessionId, revoked: false };

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: now, revokedReason: 'platform_security_revocation' } }),
      this.prisma.user.update({ where: { id: session.userId }, data: { authVersion: { increment: 1 }, updatedAt: now } }),
    ]);
    await this.recordAudit(actorUserId, 'security.session_revoked', 'session', sessionId, { userId: session.userId, email: session.user.email });
    return { ok: true, sessionId, revoked: true };
  }

  async revokeUserSessions(userId: string, actorUserId?: string, exceptSessionId?: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, accountType: 'SYSTEM' } });
    if (!user) throw new NotFoundException('System administrator not found');
    if (exceptSessionId && !/^[0-9a-f-]{36}$/i.test(exceptSessionId)) throw new BadRequestException('Invalid session id');

    const now = new Date();
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
      data: { revokedAt: now, revokedReason: 'platform_security_bulk_revocation' },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { authVersion: { increment: 1 }, updatedAt: now } });
    await this.recordAudit(actorUserId, 'security.sessions_revoked', 'user', userId, { email: user.email, count: result.count, exceptSessionId: exceptSessionId ?? null });
    return { ok: true, userId, revoked: result.count };
  }

  async loginHistory() {
    const histories = await this.prisma.loginHistory.findMany({
      where: { user: { accountType: 'SYSTEM' } },
      orderBy: [{ occurredAt: 'desc' }],
      take: 500,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
    const items = histories.map((h) => ({
      id: h.id,
      userId: h.userId,
      email: h.user.email,
      name: `${h.user.firstName ?? ''} ${h.user.lastName ?? ''}`.trim() || h.user.email,
      success: h.success,
      reason: h.reason ?? null,
      ipAddress: h.ipAddress ?? null,
      userAgent: h.userAgent ?? null,
      occurredAt: h.occurredAt,
    }));
    return { items, summary: { total: items.length, successful: items.filter((x) => x.success).length, failed: items.filter((x) => !x.success).length, uniqueIps: new Set(items.map((x) => x.ipAddress).filter(Boolean)).size } };
  }
}
