import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler'; // rate limiting — see note in README
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // brute-force protection, master prompt §5
  async login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto.email, dto.password, req.ip, req.headers['user-agent'] ?? '');
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: any) {
    return this.authService.refresh(dto.refreshToken, req.ip, req.headers['user-agent'] ?? '');
  }

  @Post('logout')
  @UseGuards() // TenantContextGuard applied at module level, see auth.module.ts
  async logout(@Req() req: any) {
    await this.authService.logout(req.authContext.sessionId);
    return { ok: true };
  }
}
