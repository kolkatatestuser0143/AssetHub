import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';

@Injectable()
export class WarrantyService {
  constructor(private readonly prisma: PrismaService) {}
  async get(auth: AuthContext, assetId: string) { await this.asset(auth, assetId); return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.warranty.findUnique({ where: { assetId } })); }
  async upsert(auth: AuthContext, assetId: string, provider?: string, expiresAt?: Date) { const asset=await this.asset(auth,assetId); return this.prisma.withTenantContext(auth.tenantId,auth.companyId,tx=>tx.warranty.upsert({where:{assetId},create:{tenantId:auth.tenantId,companyId:asset.companyId,assetId,provider:provider?.trim()||null,expiresAt:expiresAt??null},update:{provider:provider?.trim()||null,expiresAt:expiresAt??null}})); }
  async remove(auth: AuthContext, assetId: string) { await this.asset(auth,assetId); const result=await this.prisma.withTenantContext(auth.tenantId,auth.companyId,tx=>tx.warranty.deleteMany({where:{assetId}})); if(!result.count)throw new NotFoundException('Warranty not found'); return {ok:true}; }
  private async asset(auth:AuthContext,assetId:string){const asset=await this.prisma.withTenantContext(auth.tenantId,auth.companyId,tx=>tx.asset.findFirst({where:{id:assetId,tenantId:auth.tenantId,companyId:auth.companyId}}));if(!asset)throw new NotFoundException('Asset not found in your scope');return asset;}
}
