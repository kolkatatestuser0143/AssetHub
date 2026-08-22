import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

export type NotificationCategory = 'asset'|'assignment'|'transfer'|'maintenance'|'warranty'|'security'|'system'|'tenant'|'subscription'|'identity'|'platform';
type Tone = 'info'|'success'|'warning'|'danger';

@Injectable()
export class NotificationService {
  constructor(private readonly db: PrismaService) {}

  async createTenant(tenantId:string,userId:string,input:{title:string;body:string;tone?:Tone;link?:string;category?:NotificationCategory}) {
    const category=input.category??this.categoryFromText(input.title,input.body);
    if (!(await this.tenantEnabled(tenantId,userId,category))) return;
    const tone=input.tone??'info';
    await this.db.$executeRawUnsafe(`INSERT INTO ux_notifications (tenant_id,user_id,title,body,tone,link) VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6)`,tenantId,userId,input.title.trim(),input.body.trim(),tone,input.link??null);
  }

  async createSystem(userId:string,input:{title:string;body:string;tone?:Tone;link?:string;category?:NotificationCategory}) {
    const category=input.category??this.categoryFromText(input.title,input.body);
    if (!(await this.systemEnabled(userId,category))) return;
    const tone=input.tone??'info';
    await this.db.$executeRawUnsafe(`INSERT INTO system_ux_notifications (user_id,title,body,tone,link) VALUES ($1::uuid,$2,$3,$4,$5)`,userId,input.title.trim(),input.body.trim(),tone,input.link??null);
  }

  async fromAudit(input:{tenantId:string;actorUserId?:string;targetType?:string;targetId?:string;action:string;metadata?:Record<string,unknown>}) {
    const action=input.action.toLowerCase();
    if (!this.isNotifiable(action)) return;
    const category=this.categoryFromAction(action);
    const metadata=input.metadata??{};
    const recipients=new Set<string>();
    const rawRecipient=metadata.recipientUserId;
    if (typeof rawRecipient==='string') recipients.add(rawRecipient);
    const rawRecipients=metadata.recipientUserIds;
    if (Array.isArray(rawRecipients)) for (const id of rawRecipients) if (typeof id==='string') recipients.add(id);
    if (!recipients.size && input.targetType==='user' && input.targetId) recipients.add(input.targetId);
    if (!recipients.size && input.actorUserId) recipients.add(input.actorUserId);
    const message=this.describe(category,action,metadata);
    const actor = input.actorUserId ? await this.db.user.findUnique({where:{id:input.actorUserId},select:{accountType:true}}) : null;
    if (actor?.accountType==='SYSTEM') {
      const systemUsers=await this.db.user.findMany({where:{accountType:'SYSTEM',isActive:true},select:{id:true}});
      for (const user of systemUsers) await this.createSystem(user.id,{title:message.title,body:message.body,tone:message.tone,category});
      return;
    }
    for (const userId of recipients) await this.createTenant(input.tenantId,userId,{title:message.title,body:message.body,tone:message.tone,category});
  }

  private isNotifiable(action:string){return /(asset|assignment|transfer|maintenance|warranty|security|password|session|sso|scim|tenant|subscription|license|role|identity)/i.test(action) && !/notification-preferences|saved-views|search|read-all|notifications/.test(action);}
  private categoryFromAction(action:string):NotificationCategory {
    if (/transfer/.test(action)) return 'transfer';
    if (/assign/.test(action)) return 'assignment';
    if (/maintenance|repair/.test(action)) return 'maintenance';
    if (/warranty/.test(action)) return 'warranty';
    if (/security|password|session/.test(action)) return 'security';
    if (/tenant/.test(action)) return 'tenant';
    if (/subscription|license/.test(action)) return 'subscription';
    if (/sso|scim|identity/.test(action)) return 'identity';
    if (/role/.test(action)) return 'platform';
    if (/asset/.test(action)) return 'asset';
    return 'system';
  }
  private categoryFromText(title:string,body:string){return this.categoryFromAction(`${title} ${body}`);}
  private async tenantEnabled(tenantId:string,userId:string,category:NotificationCategory){const rows=await this.db.$queryRawUnsafe<any[]>(`SELECT * FROM ux_notification_preferences WHERE tenant_id=$1::uuid AND user_id=$2::uuid LIMIT 1`,tenantId,userId);if(!rows[0])return true;if(!rows[0].notifications_enabled)return false;const key={asset:'asset_events',assignment:'assignment_events',transfer:'transfer_events',maintenance:'maintenance_events',warranty:'warranty_events',security:'security_events',system:'system_events',tenant:'system_events',subscription:'system_events',identity:'security_events',platform:'system_events'}[category];return rows[0][key]!==false;}
  private async systemEnabled(userId:string,category:NotificationCategory){const rows=await this.db.$queryRawUnsafe<any[]>(`SELECT * FROM system_ux_notification_preferences WHERE user_id=$1::uuid LIMIT 1`,userId);if(!rows[0])return true;if(!rows[0].notifications_enabled)return false;const key={tenant:'tenant_events',subscription:'subscription_events',security:'security_events',identity:'identity_events',platform:'platform_events',asset:'platform_events',assignment:'platform_events',transfer:'platform_events',maintenance:'platform_events',warranty:'platform_events',system:'platform_events'}[category];return rows[0][key]!==false;}
  private describe(category:NotificationCategory,action:string,metadata:Record<string,unknown>){const id=typeof metadata.assetNumber==='string'?metadata.assetNumber:typeof metadata.id==='string'?metadata.id:'';const labels:any={asset:['Asset activity','An asset record was changed.','info'],assignment:['Assignment activity','An asset assignment was changed.','info'],transfer:['Transfer activity','An asset transfer was changed.','info'],maintenance:['Maintenance activity','Asset maintenance information was changed.','warning'],warranty:['Warranty activity','Warranty information was changed.','warning'],security:['Security alert','A security-sensitive account action was recorded.','warning'],tenant:['Tenant activity','A tenant account changed.','info'],subscription:['Subscription activity','A subscription or license changed.','warning'],identity:['Identity activity','Identity or provisioning configuration changed.','warning'],platform:['Platform activity','A platform configuration or access action was recorded.','info'],system:['System activity','An important platform action was recorded.','info']};const l=labels[category]??labels.system;return{title:l[0],body:id?`${l[1]} Reference: ${id}`:l[1],tone:l[2] as Tone};}
}
