import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class SystemTenant360Service {
  constructor(private readonly db:PrismaService){}
  async get(tenantId:string){
    if(!UUID_RE.test(tenantId)) throw new BadRequestException('Invalid organization id');
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId}}); if(!tenant) throw new NotFoundException('Organization not found');
    const [subscription,users,companies,assets,sites,locations,departments,audit,providers,scimTokens,sessions]=await Promise.all([
      this.db.subscription.findFirst({where:{tenantId},orderBy:{startedAt:'desc'}}),
      this.db.user.findMany({where:{tenantId,accountType:'TENANT'},select:{id:true,email:true,firstName:true,lastName:true,isActive:true,adminLevel:true,authSource:true,forcePasswordReset:true,createdAt:true},orderBy:{createdAt:'asc'}}),
      this.db.company.count({where:{tenantId}}), this.db.asset.count({where:{tenantId}}), this.db.site.count({where:{tenantId}}),
      this.db.location.count({where:{site:{tenantId}}}), this.db.department.count({where:{location:{site:{tenantId}}}}),
      this.db.auditEvent.findMany({where:{tenantId},orderBy:{occurredAt:'desc'},take:25}),
      this.db.identityProviderConfig.count({where:{company:{tenantId},isEnabled:true}}),
      this.db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int AS count FROM scim_tokens st INNER JOIN companies c ON c.id=st.company_id WHERE c.tenant_id=$1::uuid AND st.revoked_at IS NULL`,tenantId),
      this.db.session.count({where:{user:{tenantId,accountType:'TENANT'},revokedAt:null}}),
    ]);
    const activeUsers=users.filter(u=>u.isActive).length;
    const activeAssignments=await this.db.assetAssignment.count({where:{asset:{tenantId},returnedAt:null}});
    const overdueAssets=await this.db.asset.count({where:{tenantId,OR:[{status:{in:['lost','stolen']}},{warrantyExpiresAt:{lt:new Date()}}]}});
    return {tenant:{id:tenant.id,name:tenant.name,slug:tenant.slug,status:tenant.status,primaryEmail:tenant.primaryEmail,phone:tenant.phone,website:tenant.website,logoUrl:tenant.logoUrl,suspendedAt:tenant.suspendedAt,suspensionReason:tenant.suspensionReason,createdAt:tenant.createdAt},subscription:subscription?{id:subscription.id,planId:subscription.planId,status:subscription.status,startedAt:subscription.startedAt,endsAt:subscription.endsAt??null,graceUntil:subscription.graceUntil??null}:null,metrics:{users:users.length,activeUsers,assets,activeAssignments,companies,sites,locations,departments,overdueAssets,activeSsoProviders:providers,activeScimTokens:Number(scimTokens[0]?.count??0),activeSessions:sessions},users:users.map(u=>({id:u.id,email:u.email,name:[u.firstName,u.lastName].filter(Boolean).join(' '),isActive:u.isActive,adminLevel:u.adminLevel,authSource:u.authSource,forcePasswordReset:u.forcePasswordReset,createdAt:u.createdAt})),activity:audit.map(e=>({id:e.id,action:e.action,targetType:e.targetType,targetId:e.targetId,result:e.result,occurredAt:e.occurredAt,actorUserId:e.actorUserId})),health:{status:tenant.status==='active'?'healthy':'attention',checks:{subscription:subscription?.status==='active',sso:providers>0,scim:Number(scimTokens[0]?.count??0)>0,sessions:sessions<=activeUsers*3+5}}};
  }
}
