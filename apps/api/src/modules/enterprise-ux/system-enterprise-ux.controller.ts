import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsObject, IsString, MinLength } from 'class-validator';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemPermission } from '../../common/guards/system-permission.decorator';
import { EnterpriseUxService } from './enterprise-ux.service';
import { PrismaService } from '../../common/database/prisma.service';

class SaveViewDto { @IsString() @MinLength(1) name!: string; @IsObject() state!: Record<string, unknown>; }

@Controller('system/ux')
@UseGuards(SystemAdminGuard)
export class SystemEnterpriseUxController {
  constructor(private readonly ux:EnterpriseUxService,private readonly db:PrismaService){}
  private async auth(req:any){const user=await this.db.user.findUnique({where:{id:String(req.systemAuth.sub)},select:{id:true,tenantId:true}});return user?{userId:user.id,tenantId:user.tenantId}:null;}
  @Get('notifications') @SystemPermission('platform:console:access') async notifications(@Req() req:any){const auth=await this.auth(req);return auth?this.ux.systemNotifications(auth):[];}
  @Patch('notifications/:id/read') @SystemPermission('platform:console:access') async read(@Param('id')id:string,@Req()req:any){const auth=await this.auth(req);return auth?this.ux.systemReadNotification(auth,id):{ok:false};}
  @Patch('notifications/read-all') @SystemPermission('platform:console:access') async readAll(@Req()req:any){const auth=await this.auth(req);return auth?this.ux.systemReadAllNotifications(auth):{ok:false};}
  @Get('saved-views') @SystemPermission('platform:console:access') async savedViews(@Query('scope')scope:string,@Req()req:any){const auth=await this.auth(req);return auth?this.ux.systemSavedViews(auth,scope||'global'):[];}
  @Post('saved-views') @SystemPermission('platform:console:access') async save(@Query('scope')scope:string,@Body()dto:SaveViewDto,@Req()req:any){const auth=await this.auth(req);return auth?this.ux.systemSaveView(auth,scope||'global',dto.name,dto.state):null;}
  @Delete('saved-views/:id') @SystemPermission('platform:console:access') async del(@Param('id')id:string,@Req()req:any){const auth=await this.auth(req);return auth?this.ux.systemDeleteView(auth,id):{ok:false};}
  @Get('search') @SystemPermission('platform:console:access') async search(@Query('q')q:string){return this.ux.systemSearch(q||'');}
}
