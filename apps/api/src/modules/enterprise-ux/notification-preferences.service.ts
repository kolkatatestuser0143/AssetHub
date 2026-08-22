import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';

type TenantPreferences = {
  notificationsEnabled: boolean;
  assetEvents: boolean;
  assignmentEvents: boolean;
  transferEvents: boolean;
  maintenanceEvents: boolean;
  warrantyEvents: boolean;
  securityEvents: boolean;
  systemEvents: boolean;
};

type SystemPreferences = {
  notificationsEnabled: boolean;
  tenantEvents: boolean;
  subscriptionEvents: boolean;
  securityEvents: boolean;
  identityEvents: boolean;
  platformEvents: boolean;
};

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly db: PrismaService) {}

  async getTenant(auth: AuthContext): Promise<TenantPreferences> {
    const rows = await this.db.$queryRawUnsafe<any[]>(`SELECT notifications_enabled AS "notificationsEnabled", asset_events AS "assetEvents", assignment_events AS "assignmentEvents", transfer_events AS "transferEvents", maintenance_events AS "maintenanceEvents", warranty_events AS "warrantyEvents", security_events AS "securityEvents", system_events AS "systemEvents" FROM ux_notification_preferences WHERE tenant_id=$1::uuid AND user_id=$2::uuid LIMIT 1`, auth.tenantId, auth.userId);
    if (rows[0]) return rows[0];
    return { notificationsEnabled: true, assetEvents: true, assignmentEvents: true, transferEvents: true, maintenanceEvents: true, warrantyEvents: true, securityEvents: true, systemEvents: true };
  }

  async updateTenant(auth: AuthContext, value: Partial<TenantPreferences>) {
    const current = await this.getTenant(auth);
    const next = { ...current, ...value };
    await this.db.$executeRawUnsafe(`INSERT INTO ux_notification_preferences (tenant_id,user_id,notifications_enabled,asset_events,assignment_events,transfer_events,maintenance_events,warranty_events,security_events,system_events) VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (tenant_id,user_id) DO UPDATE SET notifications_enabled=EXCLUDED.notifications_enabled,asset_events=EXCLUDED.asset_events,assignment_events=EXCLUDED.assignment_events,transfer_events=EXCLUDED.transfer_events,maintenance_events=EXCLUDED.maintenance_events,warranty_events=EXCLUDED.warranty_events,security_events=EXCLUDED.security_events,system_events=EXCLUDED.system_events,updated_at=NOW()`, auth.tenantId, auth.userId, next.notificationsEnabled, next.assetEvents, next.assignmentEvents, next.transferEvents, next.maintenanceEvents, next.warrantyEvents, next.securityEvents, next.systemEvents);
    return next;
  }

  async getSystem(userId: string): Promise<SystemPreferences> {
    const rows = await this.db.$queryRawUnsafe<any[]>(`SELECT notifications_enabled AS "notificationsEnabled", tenant_events AS "tenantEvents", subscription_events AS "subscriptionEvents", security_events AS "securityEvents", identity_events AS "identityEvents", platform_events AS "platformEvents" FROM system_ux_notification_preferences WHERE user_id=$1::uuid LIMIT 1`, userId);
    if (rows[0]) return rows[0];
    return { notificationsEnabled: true, tenantEvents: true, subscriptionEvents: true, securityEvents: true, identityEvents: true, platformEvents: true };
  }

  async updateSystem(userId: string, value: Partial<SystemPreferences>) {
    const current = await this.getSystem(userId);
    const next = { ...current, ...value };
    await this.db.$executeRawUnsafe(`INSERT INTO system_ux_notification_preferences (user_id,notifications_enabled,tenant_events,subscription_events,security_events,identity_events,platform_events) VALUES ($1::uuid,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id) DO UPDATE SET notifications_enabled=EXCLUDED.notifications_enabled,tenant_events=EXCLUDED.tenant_events,subscription_events=EXCLUDED.subscription_events,security_events=EXCLUDED.security_events,identity_events=EXCLUDED.identity_events,platform_events=EXCLUDED.platform_events,updated_at=NOW()`, userId, next.notificationsEnabled, next.tenantEvents, next.subscriptionEvents, next.securityEvents, next.identityEvents, next.platformEvents);
    return next;
  }
}
