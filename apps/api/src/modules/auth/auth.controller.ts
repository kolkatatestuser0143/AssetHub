import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.dto';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { clearSystemAuthCookies, clearTenantAuthCookies, readCookie, LEGACY_REFRESH_COOKIE, SYSTEM_ACCESS_COOKIE, SYSTEM_REFRESH_COOKIE, TENANT_ACCESS_COOKIE, TENANT_REFRESH_COOKIE, setSystemAuthCookies, setTenantAuthCookies } from '../../common/auth/auth-cookies';

class ChangePasswordDto {
  @IsOptional() @IsString() currentPassword?: string;
  @IsString() @MinLength(12) newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly jwt: JwtService) {}
  private sendSession(res: any, result: any, scope: 'tenant' | 'system') { if (scope === 'system') setSystemAuthCookies(res, result.accessToken, result.refreshToken); else setTenantAuthCookies(res, result.accessToken, result.refreshToken); return { ok: true, sessionId: result.sessionId, accountType: result.accountType, forcePasswordReset: result.forcePasswordReset === true }; }
  private cookieNames(scope: 'tenant' | 'system') { return scope === 'system' ? { access: SYSTEM_ACCESS_COOKIE, refresh: SYSTEM_REFRESH_COOKIE } : { access: TENANT_ACCESS_COOKIE, refresh: TENANT_REFRESH_COOKIE }; }
  private tenantSlug(req: any): string | undefined {
    const header = String(req.headers?.['x-tenant-slug'] ?? '').trim().toLowerCase();
    return header || undefined;
  }

  @Get('csrf')
  csrf() { return { ok: true }; }

  @Post('login') @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) { return this.sendSession(res, await this.authService.login(dto.email, dto.password, req.ip, req.headers['user-agent'] ?? '', this.tenantSlug(req)), 'tenant'); }

  @Post('system/login') @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async systemLogin(@Body() dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) { return this.sendSession(res, await this.authService.systemLogin(dto.email, dto.password, req.ip, req.headers['user-agent'] ?? ''), 'system'); }

  @Post('change-password')
  @UseGuards(TenantContextGuard)
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.changeTenantPassword(req.authContext.userId, dto.currentPassword, dto.newPassword, req.authContext.sessionId, req.ip, req.headers['user-agent'] ?? '');
    setTenantAuthCookies(res, result.accessToken, result.refreshToken);
    return { ok: true, mustChangePassword: false, sessionId: result.sessionId, accountType: result.accountType, forcePasswordReset: false };
  }

  @Get('session')
  async session(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const requestedScope = req.headers['x-auth-scope'] === 'system' ? 'system' : 'tenant';
    const names = this.cookieNames(requestedScope);
    const accessToken = readCookie(req, names.access);
    if (accessToken) {
      try {
        const payload = this.jwt.verify(accessToken);
        const matchesScope = requestedScope === 'system' ? payload?.accountType === 'SYSTEM' && payload?.systemAdmin === true : payload?.accountType === 'TENANT';
        if (matchesScope) return { authenticated: true, accountType: payload.accountType, forcePasswordReset: payload.forcePasswordReset === true };
      } catch {}
    }
    const refreshToken = readCookie(req, names.refresh) ?? readCookie(req, LEGACY_REFRESH_COOKIE);
    if (!refreshToken) return { authenticated: false };
    try {
      const result = await this.authService.refresh(refreshToken, req.ip, req.headers['user-agent'] ?? '');
      const actualScope = result.accountType === 'SYSTEM' ? 'system' : 'tenant';
      this.sendSession(res, result, actualScope);
      return { authenticated: true, accountType: result.accountType, forcePasswordReset: result.forcePasswordReset === true };
    } catch {
      if (requestedScope === 'system') clearSystemAuthCookies(res); else clearTenantAuthCookies(res);
      return { authenticated: false };
    }
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const requestedScope = req.headers['x-auth-scope'] === 'system' ? 'system' : 'tenant';
    const scopedRefreshToken = readCookie(req, requestedScope === 'system' ? SYSTEM_REFRESH_COOKIE : TENANT_REFRESH_COOKIE);
    const legacyRefreshToken = readCookie(req, LEGACY_REFRESH_COOKIE);
    const refreshToken = dto.refreshToken || scopedRefreshToken || legacyRefreshToken;
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const result = await this.authService.refresh(refreshToken, req.ip, req.headers['user-agent'] ?? '');
    const actualScope = result.accountType === 'SYSTEM' ? 'system' : 'tenant';
    const response = this.sendSession(res, result, actualScope);
    if (legacyRefreshToken) { const cookies = [`${LEGACY_REFRESH_COOKIE}=; Max-Age=0; Path=/api/v1/auth; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`]; const existing = res.getHeader?.('Set-Cookie'); res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing : existing ? [existing] : []), ...cookies]); }
    return response;
  }

  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const scope = req.headers['x-auth-scope'] === 'system' ? 'system' : 'tenant';
    const refreshToken = readCookie(req, scope === 'system' ? SYSTEM_REFRESH_COOKIE : TENANT_REFRESH_COOKIE) ?? readCookie(req, LEGACY_REFRESH_COOKIE);
    if (req.authContext?.sessionId && req.authContext?.userId) await this.authService.logout(req.authContext.sessionId, req.authContext.userId); else if (req.systemAuth?.sessionId && req.systemAuth?.sub) await this.authService.logout(req.systemAuth.sessionId, req.systemAuth.sub); else if (refreshToken) await this.authService.logoutByRefreshToken(refreshToken);
    if (scope === 'system') clearSystemAuthCookies(res); else clearTenantAuthCookies(res);
    return { ok: true };
  }
}