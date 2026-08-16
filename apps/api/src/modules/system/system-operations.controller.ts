import { Controller, Get, UseGuards } from '@nestjs/common';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemPermission } from '../../common/guards/system-permission.decorator';
import { SystemOperationsService } from './system-operations.service';

@Controller('system/operations')
@UseGuards(SystemAdminGuard)
export class SystemOperationsController {
  constructor(private readonly operations: SystemOperationsService) {}

  @Get('jobs')
  @SystemPermission('platform:health:read')
  jobs() { return this.operations.jobs(); }

  @Get('queue-health')
  @SystemPermission('platform:health:read')
  queueHealth() { return this.operations.health(); }
}
