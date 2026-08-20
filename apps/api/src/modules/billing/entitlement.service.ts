import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class EntitlementService {
  constructor(private readonly db: PrismaService) {}
  async getActiveSubscription(tenantId:string){const subscription=await this.db.subscription.findFirst({where:{tenantId,status:{in:['active','trialing','past_due']}},orderBy:{startedAt:'desc'}});if(!subscription)throw new ForbiddenException('Tenant has no active license');const now=Date.now();const endsAt=subscription.endsAt?.getTime()??null;const graceUntil=subscription.graceUntil?.getTime()??null;if(endsAt&&endsAt<now){if(subscription.status==='past_due'&&graceUntil&&graceUntil>now)return subscription;throw new ForbiddenException('Tenant license has expired');}return subscription;}
  async get(tenantId:string,key:string):Promise<unknown>{const subscription=await this.getActiveSubscription(tenantId);const entitlement=await this.db.entitlement.findUnique({where:{subscriptionId_key:{subscriptionId:subscription.id,key}}});if(entitlement)return entitlement.value;const plan=await this.db.plan.findUnique({where:{id:subscription.planId}});if(!plan)throw new NotFoundException('Subscription plan not found');return (plan.features as Record<string,unknown>|null)?.[key];}
  async getNumber(tenantId:string,key:string){const value=await this.get(tenantId,key);if(value===null||value===undefined)return null;if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new ForbiddenException(`Invalid numeric entitlement: ${key}`);return value;}
  async requireFeature(tenantId:string,key:string){const value=await this.get(tenantId,key);if(value!==true)throw new ForbiddenException(`Feature not enabled: ${key}`);return true;}
  async requireWithinLimit(tenantId:string,key:string,currentCount:number,increment=1){const value=await this.getNumber(tenantId,key);if(value===null)return true;if(currentCount+increment>value)throw new ForbiddenException(`License limit reached: ${key} (${value})`);return true;}
}
