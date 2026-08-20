CREATE TABLE IF NOT EXISTS system_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NULL,
  action text NOT NULL,
  target_type text NULL,
  target_id text NULL,
  metadata jsonb NULL,
  result text NULL,
  route text NULL,
  method text NULL,
  status_code integer NULL,
  request_id text NULL,
  ip_address text NULL,
  user_agent text NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_audit_events_occurred_at_idx ON system_audit_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS system_audit_events_actor_user_id_occurred_at_idx ON system_audit_events (actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS system_audit_events_action_occurred_at_idx ON system_audit_events (action, occurred_at DESC);
