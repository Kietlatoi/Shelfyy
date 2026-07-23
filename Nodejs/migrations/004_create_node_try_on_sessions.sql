CREATE TABLE IF NOT EXISTS node_try_on_sessions (
  try_on_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  outfit_id BIGINT REFERENCES outfits(outfit_id) ON DELETE SET NULL,
  clothing_item_id BIGINT REFERENCES wardrobe_items(item_id) ON DELETE SET NULL,
  input_file_id BIGINT NOT NULL REFERENCES file_assets(file_id),
  result_file_id BIGINT REFERENCES file_assets(file_id),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  accuracy_score NUMERIC(5,2),
  processing_time_seconds NUMERIC(6,2),
  error_message VARCHAR(500),
  prediction_id VARCHAR(255),
  deleted_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITHOUT TIME ZONE,
  CONSTRAINT ck_node_try_on_sessions_status CHECK(status IN ('PENDING','PROCESSING','COMPLETED','FAILED'))
);

CREATE INDEX IF NOT EXISTS ix_node_try_on_sessions_user
  ON node_try_on_sessions(user_id);

CREATE INDEX IF NOT EXISTS ix_node_try_on_sessions_status
  ON node_try_on_sessions(status);

CREATE INDEX IF NOT EXISTS ix_node_try_on_sessions_created_at
  ON node_try_on_sessions(created_at);
