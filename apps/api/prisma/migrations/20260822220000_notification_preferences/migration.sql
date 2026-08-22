CREATE TABLE "ux_notification_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "notifications_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "asset_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "assignment_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "transfer_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "maintenance_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "warranty_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "security_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "system_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ux_notification_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ux_notification_preferences_unique" UNIQUE ("tenant_id","user_id"),
  CONSTRAINT "ux_notification_preferences_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ux_notification_preferences_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ux_notification_preferences_user_idx" ON "ux_notification_preferences"("user_id");

CREATE TABLE "system_ux_notification_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "notifications_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "tenant_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "subscription_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "security_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "identity_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "platform_events" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "system_ux_notification_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "system_ux_notification_preferences_unique" UNIQUE ("user_id"),
  CONSTRAINT "system_ux_notification_preferences_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "system_ux_notification_preferences_user_idx" ON "system_ux_notification_preferences"("user_id");
