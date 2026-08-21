import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { asPrismaJson } from '../../common/prisma-json';
@Injectable()
export class PlanEntitlementSyncService {
  constructor(private readonly db: PrismaService) {}
  async materializeSubscription(subscriptionId:string,features:Record<string,unknown>){for(const [key,value] of Object.entries(features)){await this.db.entitlement.upsert({where:{subscriptionId_key:{subscriptionId,key}},create:{subscriptionId,key,value:asPrismaJson(value),source:'plan'},update:{}});}}
  async syncPlan(planId:string,features:Record<string,unknown>){const subscriptions=await this.db.subscription.findMany({where:{planId,status:{in:['active','trialing','past_due']}},select:{id:true}});const keys=Object.keys(features);for(const subscription of subscriptions){for(const [key,value] of Object.entries(features)){const existing=await this.db.entitlement.findUnique({where:{subscriptionId_key:{subscriptionId:subscription.id,key}}});if(existing?.source==='override')continue;await this.db.entitlement.upsert({where:{subscriptionId_key:{subscriptionId:subscription.id,key}},create:{subscriptionId:subscription.id,key,value:asPrismaJson(value),source:'plan'},update:{value:asPrismaJson(value),source:'plan'}});}await this.db.entitlement.deleteMany({where:{subscriptionId:subscription.id,source:'plan',...(keys.length?{key:{notIn:keys}}:{})}});}return{subscriptionsUpdated:subscriptions.length};}
  async markOverride(subscriptionId:string,key:string){await this.db.entitlement.updateMany({where:{subscriptionId,key},data:{source:'override'}});}
}
