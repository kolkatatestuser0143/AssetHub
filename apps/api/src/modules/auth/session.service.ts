import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { EntitlementService } from '../billing/entitlement.service';

const ACCESS_TOKEN_TTL = '10m';
const DEFAULT_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly entitlements: EntitlementService) {}

  async issueSession(userId: string, ip: string, userAgent: string, system = false, familyId?: string, parentTokenHash?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (system && user.accountType !== 'SYSTEM') throw new UnauthorizedException('System session requires a system account');
    if (!system && user.accountType !== 'TENANT') throw new UnauthorizedException('Tenant session requires a tenant account');

    let refreshTokenTtlMs = DEFAULT_REFRESH_TOKEN_TTL_MS;
    if (!system) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { status: true } });
      if (!tenant) throw new UnauthorizedException('This tenant account is unavailable. Please contact your system administrator.');
      if (tenant.status !== 'active') {
        if (tenant.status === 'suspended') throw new UnauthorizedException('This tenant is suspended. Please contact your system administrator.');
        if (tenant.status === 'archived') throw new UnauthorizedException('This tenant is archived and cannot be accessed.');
        throw new UnauthorizedException('This tenant account is unavailable. Please contact your system administrator.');
      }
      const company = await this.prisma.company.findFirst({ where: { id: user.companyId, tenantId: user.tenantId }, select: { id: true } });
      if (!company) throw new UnauthorizedException('Your tenant account is not assigned to a valid company. Please contact your tenant administrator.');
      const maxSessionDays = await this.entitlements.getNumber(user.tenantId, 'session_max_days');
      if (maxSessionDays !== null) refreshTokenTtlMs = maxSessionDays * 24 * 60 * 60 * 1000;
      if (refreshTokenTtlMs <= 0) throw new ForbiddenException('Tenant session policy is invalid');
      const maxConcurrent = await this.entitlements.getNumber(user.tenantId, 'max_concurrent_sessions');
      if (maxConcurrent !== null) {
        const activeSessions = await this.prisma.session.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: [{ lastSeenAt: 'asc' }, { createdAt: 'asc' }] });
        const overflow = activeSessions.length - maxConcurrent + 1;
        if (overflow > 0) await this.prisma.session.updateMany({ where: { id: { in: activeSessions.slice(0, overflow).map(s => s.id) }, userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'concurrent_session_limit' } });
      }
    }

    const access = system ? await this.resolveSystemPermissions(user.roleIds) : await this.resolveTenantAccess(user.tenantId, user.companyId, user.roleIds);
    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const tokenFamilyId = familyId ?? crypto.randomUUID();
    const session = await this.prisma.session.create({ data: { userId, refreshTokenHash: this.hashToken(rawRefreshToken), familyId: tokenFamilyId, parentTokenHash, ipAddress: ip, userAgent, lastSeenAt: new Date(), expiresAt: new Date(Date.now() + refreshTokenTtlMs) } });
    const claims: Record<string, any> = { sub: userId, sessionId: session.id, permissions: access.permissions, accountType: user.accountType, authVersion: user.authVersion };
    if (system) claims.systemAdmin = true;
    else { claims.tenantId = user.tenantId; claims.companyId = user.companyId; claims.crossCompany = access.crossCompany; claims.adminLevel = user.adminLevel; claims.forcePasswordReset = user.forcePasswordReset; }
    const accessToken = this.jwt.sign(claims, { expiresIn: ACCESS_TOKEN_TTL });
    return { accessToken, refreshToken: rawRefreshToken, sessionId: session.id, accountType: user.accountType, adminLevel: !system ? user.adminLevel : undefined, forcePasswordReset: !system && user.forcePasswordReset };
  }

  async isSystemUser(userId: string): Promise<boolean> { const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } }); return user?.accountType === 'SYSTEM'; }
  async revokeSession(sessionId: string, userId: string, reason: string) { await this.prisma.session.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } }); }
  async revokeFamily(familyId: string, reason: string) { if (!familyId) return; await this.prisma.session.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } }); }

  async rotateRefreshToken(rawRefreshToken: string, ip: string, userAgent: string) {
    const hash = this.hashToken(rawRefreshToken);
    const existing = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    if (!existing) throw new UnauthorizedException('Invalid refresh token');
    if (existing.revokedAt) { await this.revokeFamily(existing.familyId, 'refresh_token_reuse_detected'); throw new UnauthorizedException('Refresh token reuse detected'); }
    if (existing.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');
    const consumed = await this.prisma.session.updateMany({ where: { id: existing.id, refreshTokenHash: hash, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'rotated' } });
    if (!consumed.count) { await this.revokeFamily(existing.familyId, 'refresh_token_reuse_detected'); throw new UnauthorizedException('Refresh token reuse detected'); }
    return this.issueSession(existing.userId, ip, userAgent, await this.isSystemUser(existing.userId), existing.familyId, hash);
  }

  async findByRefreshToken(rawRefreshToken: string) { return this.prisma.session.findUnique({ where: { refreshTokenHash: this.hashToken(rawRefreshToken) } }); }
  hashToken(raw: string): string { return crypto.createHash('sha256').update(raw).digest('hex'); }

  private async resolveTenantAccess(tenantId: string, companyId: string, roleIds: string[]): Promise<{ permissions: string[]; crossCompany: boolean }> {
    if (!roleIds.length) return { permissions: [], crossCompany: false };
    const roles: any[] = await this.prisma.$queryRaw`SELECT "companyId", permissions FROM roles WHERE id = ANY(${roleIds}::uuid[]) AND "tenantId" = ${tenantId}::uuid AND ("companyId" = ${companyId}::uuid OR "companyId" IS NULL)`;
    const perms = new Set<string>(); let crossCompany = false;
    for (const role of roles) { if (role.companyId == null) crossCompany = true; for (const rp of (role.permissions ?? [])) perms.add(rp.permissionKey); }
    return { permissions: [...perms], crossCompany };
  }

  private async resolveSystemPermissions(roleIds: string[]): Promise<string[]> {
    if (!roleIds.length) return [];
    const roles: any[] = await this.prisma.$queryRaw`SELECT permissions FROM roles WHERE id = ANY(${roleIds}::uuid[])`;
    const perms = new Set<string>(); for (const role of roles) for (const rp of (role.permissions ?? [])) perms.add(rp.permissionKey); return [...perms];
  }
}
