CREATE TABLE "ux_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "tone" TEXT NOT NULL DEFAULT 'info',
  "link" TEXT,
  "read_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ux_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ux_notifications_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ux_notifications_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ux_notifications_tone_check" CHECK ("tone" IN ('info','success','warning','danger'))
);
CREATE INDEX "ux_notifications_user_unread_idx" ON "ux_notifications"("user_id","read_at","created_at");
CREATE INDEX "ux_notifications_tenant_created_idx" ON "ux_notifications"("tenant_id","created_at");

CREATE TABLE "ux_saved_views" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "scope" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ux_saved_views_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ux_saved_views_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ux_saved_views_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ux_saved_views_unique" UNIQUE ("user_id","scope","name")
);
CREATE INDEX "ux_saved_views_scope_idx" ON "ux_saved_views"("tenant_id","user_id","scope");
