CREATE TABLE "system_ux_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "tone" TEXT NOT NULL DEFAULT 'info',
  "link" TEXT,
  "read_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "system_ux_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "system_ux_notifications_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "system_ux_notifications_tone_check" CHECK ("tone" IN ('info','success','warning','danger'))
);
CREATE INDEX "system_ux_notifications_user_unread_idx" ON "system_ux_notifications"("user_id","read_at","created_at");
