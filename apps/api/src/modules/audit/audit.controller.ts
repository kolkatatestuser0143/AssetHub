import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(TenantContextGuard, RbacGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermission('audit:read')
  list(
    @Req() req: any,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.list(req.authContext, {
      action,
      targetType,
      actorUserId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Get('summary')
  @RequirePermission('audit:read')
  summary(@Req() req: any) {
    return this.audit.summary(req.authContext);
  }

  @Get('export.csv')
  @RequirePermission('audit:read')
  async exportCsv(@Req() req: any) {
    return { filename: 'assethub-audit.csv', csv: await this.audit.csv(req.authContext) };
  }
}
