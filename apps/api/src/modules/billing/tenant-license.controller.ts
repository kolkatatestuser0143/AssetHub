import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { TenantLicenseService } from './tenant-license.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('billing')
@UseGuards(TenantContextGuard, RbacGuard)
export class TenantLicenseController {
  constructor(private readonly licenses: TenantLicenseService) {}

  @Get('license')
  @RequirePermission('billing:read')
  getLicense(@Req() req: any) {
    return this.licenses.get(req.authContext);
  }
}
