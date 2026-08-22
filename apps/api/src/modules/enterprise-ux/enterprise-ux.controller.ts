import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { EnterpriseUxService } from './enterprise-ux.service';

class SaveViewDto { @IsString() @MinLength(1) name!: string; @IsObject() state!: Record<string, unknown>; }
class NotificationDto { @IsString() @MinLength(1) title!: string; @IsString() @MinLength(1) body!: string; @IsOptional() @IsString() tone?: string; @IsOptional() @IsString() link?: string; }

@Controller('ux')
@UseGuards(TenantContextGuard, RbacGuard, FeatureGuard)
export class EnterpriseUxController {
  constructor(private readonly ux: EnterpriseUxService) {}
  @Get('notifications') notifications(@Req() req:any) { return this.ux.notifications(req.authContext); }
  @Patch('notifications/:id/read') read(@Param('id') id:string,@Req() req:any){return this.ux.markNotificationRead(req.authContext,id);}
  @Patch('notifications/read-all') readAll(@Req() req:any){return this.ux.markAllNotificationsRead(req.authContext);}
  @Post('notifications') @RequirePermission('audit:read') createNotification(@Body() dto:NotificationDto,@Req() req:any){return this.ux.createNotification(req.authContext.tenantId,req.authContext.userId,dto).then(()=>({ok:true}));}
  @Get('saved-views') savedViews(@Query('scope') scope:string,@Req() req:any){return this.ux.savedViews(req.authContext,scope||'global');}
  @Post('saved-views') saveView(@Query('scope') scope:string,@Body() dto:SaveViewDto,@Req() req:any){return this.ux.saveView(req.authContext,scope||'global',dto.name,dto.state);}
  @Delete('saved-views/:id') deleteView(@Param('id')id:string,@Req()req:any){return this.ux.deleteView(req.authContext,id);}
  @Get('search') @RequirePermission('asset:read') search(@Query('q') q:string,@Req()req:any){return this.ux.globalSearch(req.authContext,q||'');}
  @Get('assets/:assetId/risk') @RequirePermission('asset:read') risk(@Param('assetId')id:string,@Req()req:any){return this.ux.assetRisk(req.authContext,id);}
}
