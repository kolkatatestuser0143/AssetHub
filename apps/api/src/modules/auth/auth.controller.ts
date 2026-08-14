import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.dto';
import {
  clearSystemAuthCookies,
  clearTenantAuthCookies,
  readCookie,
  LEGACY_REFRESH_COOKIE,
  SYSTEM_REFRESH_COOKIE,
  TENANT_REFRESH_COOKIE,
  setSystemAuthCookies,
  setTenantAuthCookies,
} from '../../common/auth/auth-cookies';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private sendSession(res: any, result: any, scope: 'tenant' | 'system') {
    if (scope === 'system') setSystemAuthCookies(res, result.accessToken, result.refreshToken);
    else setTenantAuthCookies(res, result.accessToken, result.refreshToken);
    return { ok: true, sessionId: result.sessionId, accountType: result.accountType };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.login(dto.email, dto.password, req.ip, req.headers['user-agent'] ?? '');
    return this.sendSession(res, result, 'tenant');
  }

  @Post('system/login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async systemLogin(@Body() dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.systemLogin(dto.email, dto.password, req.ip, req.headers['user-agent'] ?? '');
    return this.sendSession(res, result, 'system');
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const requestedScope = req.headers['x-auth-scope'] === 'system' ? 'system' : 'tenant';
    const scopedRefreshToken = readCookie(
      req,
      requestedScope === 'system' ? SYSTEM_REFRESH_COOKIE : TENANT_REFRESH_COOKIE,
    );
    const legacyRefreshToken = readCookie(req, LEGACY_REFRESH_COOKIE);
    const refreshToken = dto.refreshToken || scopedRefreshToken || legacyRefreshToken;

    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    const result = await this.authService.refresh(
      refreshToken,
      req.ip,
      req.headers['user-agent'] ?? '',
    );

    const actualScope = result.accountType === 'SYSTEM' ? 'system' : 'tenant';
    const response = this.sendSession(res, result, actualScope);

    // Always clear the legacy cookie after a successful refresh. This makes the
    // migration one-way and leaves the browser with only scoped auth cookies.
    if (legacyRefreshToken) {
      const cookies = [
        `${LEGACY_REFRESH_COOKIE}=; Max-Age=0; Path=/api/v1/auth; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
      ];
      const existing = res.getHeader?.('Set-Cookie');
      res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing : existing ? [existing] : []), ...cookies]);
    }

    return response;
  }

  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const scope = req.headers['x-auth-scope'] === 'system' ? 'system' : 'tenant';
    const refreshToken = readCookie(req, scope === 'system' ? SYSTEM_REFRESH_COOKIE : TENANT_REFRESH_COOKIE)
      ?? readCookie(req, LEGACY_REFRESH_COOKIE);

    if (req.authContext?.sessionId && req.authContext?.userId) {
      await this.authService.logout(req.authContext.sessionId, req.authContext.userId);
    } else if (req.systemAuth?.sessionId && req.systemAuth?.sub) {
      await this.authService.logout(req.systemAuth.sessionId, req.systemAuth.sub);
    } else if (refreshToken) {
      await this.authService.logoutByRefreshToken(refreshToken);
    }

    if (scope === 'system') clearSystemAuthCookies(res);
    else clearTenantAuthCookies(res);
    return { ok: true };
  }
}
