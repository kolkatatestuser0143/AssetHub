import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemPermission } from '../../common/guards/system-permission.decorator';
import { EnterpriseUxService } from './enterprise-ux.service';
import { PrismaService } from '../../common/database/prisma.service';

class SaveViewDto { @IsString() @MinLength(1) name!: string; @IsObject() state!: Record<string, unknown>; }
class SystemNotificationDto { @IsString() @MinLength(1) title!: string; @IsString() @MinLength(1) body!: string; @IsOptional() @IsString() tone?: string; @IsOptional() @IsString() link?: string; }

@Controller('system/ux')
@UseGuards(SystemAdminGuard)
export class SystemEnterpriseUxController {
  constructor(private readonly ux:EnterpriseUxService,private readonly db:PrismaService){}
  private userId(req:any){return String(req.systemAuth.sub)}
  @Get('notifications') @SystemPermission('platform:console:access') async notifications(@Req() req:any){return this.ux.systemNotifications({userId:this.userId(req)});}
  @Patch('notifications/:id/read') @SystemPermission('platform:console:access') async read(@Param('id')id:string,@Req()req:any){return this.ux.systemReadNotification({userId:this.userId(req)},id);}
  @Patch('notifications/read-all') @SystemPermission('platform:console:access') async readAll(@Req()req:any){return this.ux.systemReadAllNotifications({userId:this.userId(req)});}
  @Post('notifications') @SystemPermission('platform:console:access') async createNotification(@Body()dto:SystemNotificationDto,@Req()req:any){await this.ux.createSystemNotification(this.userId(req),dto);return{ok:true};}
  @Get('saved-views') @SystemPermission('platform:console:access') async savedViews(@Query('scope')scope:string,@Req()req:any){const u=await this.db.user.findUnique({where:{id:this.userId(req)},select:{tenantId:true}});return u?.tenantId?this.ux.systemSavedViews(u.tenantId,this.userId(req),scope||'global'):[];}
  @Post('saved-views') @SystemPermission('platform:console:access') async save(@Query('scope')scope:string,@Body()dto:SaveViewDto,@Req()req:any){const u=await this.db.user.findUnique({where:{id:this.userId(req)},select:{tenantId:true}});return u?.tenantId?this.ux.systemSaveView(u.tenantId,this.userId(req),scope||'global',dto.name,dto.state):null;}
  @Delete('saved-views/:id') @SystemPermission('platform:console:access') async del(@Param('id')id:string,@Req()req:any){const u=await this.db.user.findUnique({where:{id:this.userId(req)},select:{tenantId:true}});return u?.tenantId?this.ux.systemDeleteView(u.tenantId,this.userId(req),id):{ok:false};}
  @Get('search') @SystemPermission('platform:console:access') async search(@Query('q')q:string){return this.ux.systemSearch(q||'');}
}
