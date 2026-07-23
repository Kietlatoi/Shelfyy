ALTER TABLE node_try_on_sessions
  ADD COLUMN IF NOT EXISTS is_saved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS saved_at TIMESTAMP WITHOUT TIME ZONE;

CREATE INDEX IF NOT EXISTS ix_node_try_on_sessions_user_saved
  ON node_try_on_sessions(user_id, is_saved, saved_at DESC)
  WHERE deleted_at IS NULL;
