import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/database/prisma.service';
import { SessionService } from './session.service';

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly sessions: SessionService) {}
  async hashPassword(plain: string): Promise<string> { return argon2.hash(plain, { type: argon2.argon2id }); }

  async login(email: string, password: string, ip: string, userAgent: string, tenantSlug?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const slug = tenantSlug?.trim().toLowerCase();
    if (slug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true, status: true } });
      if (!tenant) throw new UnauthorizedException('This tenant account is unavailable. Please contact your system administrator.');
      if (tenant.status !== 'active') throw new UnauthorizedException(tenant.status === 'suspended' ? 'This tenant is suspended. Please contact your system administrator.' : tenant.status === 'archived' ? 'This tenant is archived and cannot be accessed.' : 'This tenant account is unavailable. Please contact your system administrator.');
    } else if (process.env.REQUIRE_TENANT_HOST === 'true' && process.env.NODE_ENV === 'production') throw new UnauthorizedException('Tenant login domain is required');
    const user = await this.prisma.user.findFirst({ where: { email: normalizedEmail, accountType: 'TENANT', ...(slug ? { tenant: { slug } } : {}) } });
    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) { await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_locked'); throw new UnauthorizedException('Account temporarily locked. Try again later.'); }
    if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, password))) { await this.recordLoginAttempt(user?.id ?? null, false, ip, userAgent, 'invalid_credentials'); if (user) await this.registerFailedLogin(user.id); throw new UnauthorizedException('Invalid email or password'); }
    if (!user.isActive) { await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_inactive'); throw new UnauthorizedException('Account is inactive'); }
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { status: true } });
    if (!tenant || tenant.status !== 'active') throw new UnauthorizedException('This tenant account is unavailable. Please contact your system administrator.');
    await this.clearFailedLogins(user.id); await this.recordLoginAttempt(user.id, true, ip, userAgent, null);
    return this.sessions.issueSession(user.id, ip, userAgent, false);
  }

  async systemLogin(email: string, password: string, ip: string, userAgent: string) {
    const user = await this.prisma.user.findFirst({ where: { email: email.trim().toLowerCase(), accountType: 'SYSTEM' } });
    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) { await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_locked'); throw new UnauthorizedException('Account temporarily locked. Try again later.'); }
    if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, password))) { await this.recordLoginAttempt(user?.id ?? null, false, ip, userAgent, 'invalid_system_credentials'); if (user) await this.registerFailedLogin(user.id); throw new UnauthorizedException('Invalid system administrator credentials'); }
    if (!user.isActive) { await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_inactive'); throw new UnauthorizedException('System administrator account is inactive'); }
    const permissions = await this.resolveSystemPermissions(user.roleIds);
    if (!permissions.includes('platform:console:access')) { await this.recordLoginAttempt(user.id, false, ip, userAgent, 'missing_console_permission'); throw new UnauthorizedException('Account is not permitted to access the system console'); }
    await this.clearFailedLogins(user.id); await this.recordLoginAttempt(user.id, true, ip, userAgent, null);
    return this.sessions.issueSession(user.id, ip, userAgent, true);
  }

  async changeTenantPassword(userId: string, currentPassword: string | undefined, newPassword: string, currentSessionId: string, ip: string, userAgent: string) {
    if (!currentSessionId) throw new UnauthorizedException('Active tenant session is required');
    if (!newPassword || newPassword.length < 12) throw new BadRequestException('Password must be at least 12 characters');
    const user = await this.prisma.user.findFirst({ where: { id: userId, accountType: 'TENANT' } });
    if (!user?.passwordHash) throw new UnauthorizedException('Tenant account not found');
    if (!user.forcePasswordReset && currentPassword && !(await argon2.verify(user.passwordHash, currentPassword))) throw new UnauthorizedException('Current password is incorrect');
    if (!user.forcePasswordReset && !currentPassword) throw new BadRequestException('Current password is required');
    if (await argon2.verify(user.passwordHash, newPassword)) throw new BadRequestException('New password must be different from the current password');
    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash, forcePasswordReset: false, failedLoginAttempts: 0, lockedUntil: null, authVersion: { increment: 1 } } });
    await this.prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'password_changed' } });
    await this.prisma.auditEvent.create({ data: { tenantId: user.tenantId, companyId: user.companyId, actorUserId: user.id, action: 'auth.password_changed', targetType: 'user', targetId: user.id, result: 'success', occurredAt: new Date() } });
    return { ok: true, mustChangePassword: false, ...(await this.sessions.issueSession(user.id, ip, userAgent, false)) };
  }

  async refresh(rawRefreshToken: string, ip: string, userAgent: string) { return this.sessions.rotateRefreshToken(rawRefreshToken, ip, userAgent); }
  async logout(sessionId: string, userId: string) { await this.sessions.revokeSession(sessionId, userId, 'user_logout'); }
  async logoutByRefreshToken(rawRefreshToken: string) { const session = await this.sessions.findByRefreshToken(rawRefreshToken); if (session && !session.revokedAt) await this.sessions.revokeSession(session.id, session.userId, 'user_logout'); }

  private async registerFailedLogin(userId: string) { const now = new Date(); const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { failedLoginAttempts: true, lockedUntil: true } }); if (!user) return; if (user.lockedUntil && user.lockedUntil.getTime() <= now.getTime()) { await this.prisma.user.update({ where: { id: userId }, data: { failedLoginAttempts: 1, lockedUntil: null } }); return; } const attempts = user.failedLoginAttempts + 1; await this.prisma.user.update({ where: { id: userId }, data: { failedLoginAttempts: attempts, ...(attempts >= MAX_FAILED_LOGINS ? { lockedUntil: new Date(now.getTime() + LOCKOUT_MS) } : {}) } }); }
  private async clearFailedLogins(userId: string) { await this.prisma.user.update({ where: { id: userId }, data: { failedLoginAttempts: 0, lockedUntil: null } }); }
  private async resolveSystemPermissions(roleIds: string[]): Promise<string[]> { if (!roleIds.length) return []; const roles: any[] = await this.prisma.$queryRaw`SELECT permissions FROM roles WHERE id = ANY(${roleIds}::uuid[])`; const perms = new Set<string>(); for (const role of roles) for (const permission of (role.permissions ?? [])) if (permission.permissionKey) perms.add(permission.permissionKey); return [...perms]; }
  private async recordLoginAttempt(userId: string | null, success: boolean, ip: string, userAgent: string, reason: string | null) { if (!userId) return; await this.prisma.loginHistory.create({ data: { userId, success, ipAddress: ip, userAgent, reason, occurredAt: new Date() } }); }
}
