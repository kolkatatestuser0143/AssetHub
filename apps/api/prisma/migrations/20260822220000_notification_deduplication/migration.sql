ALTER TABLE "ux_notifications"
  ADD COLUMN "dedupe_key" TEXT;

ALTER TABLE "system_ux_notifications"
  ADD COLUMN "dedupe_key" TEXT;

CREATE UNIQUE INDEX "ux_notifications_user_dedupe_key_idx"
  ON "ux_notifications"("user_id", "dedupe_key");

CREATE UNIQUE INDEX "system_ux_notifications_user_dedupe_key_idx"
  ON "system_ux_notifications"("user_id", "dedupe_key");
