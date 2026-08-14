import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.dto';
import { clearAuthCookies, readCookie, REFRESH_COOKIE, setAuthCookies } from '../../common/auth/auth-cookies';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private sendSession(res: any, result: any) {
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { ok: true, sessionId: result.sessionId, accountType: result.accountType };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.login(dto.email, dto.password, req.ip, req.headers['user-agent'] ?? '');
    return this.sendSession(res, result);
  }

  @Post('system/login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async systemLogin(@Body() dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.systemLogin(dto.email, dto.password, req.ip, req.headers['user-agent'] ?? '');
    return this.sendSession(res, result);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const refreshToken = dto.refreshToken || readCookie(req, REFRESH_COOKIE);
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const result = await this.authService.refresh(refreshToken, req.ip, req.headers['user-agent'] ?? '');
    return this.sendSession(res, result);
  }

  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    if (req.authContext?.sessionId && req.authContext?.userId) {
      await this.authService.logout(req.authContext.sessionId, req.authContext.userId);
    } else if (req.systemAuth?.sessionId && req.systemAuth?.sub) {
      await this.authService.logout(req.systemAuth.sessionId, req.systemAuth.sub);
    } else {
      const refreshToken = readCookie(req, REFRESH_COOKIE);
      if (refreshToken) await this.authService.logoutByRefreshToken(refreshToken);
    }
    clearAuthCookies(res);
    return { ok: true };
  }
}
