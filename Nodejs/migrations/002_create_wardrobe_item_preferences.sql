CREATE TABLE IF NOT EXISTS wardrobe_item_preferences (
  preference_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES wardrobe_items(item_id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  item_status VARCHAR(30) NOT NULL DEFAULT 'IN_USE',
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_wardrobe_item_preferences_user_item UNIQUE (user_id, item_id),
  CONSTRAINT ck_wardrobe_item_preferences_status CHECK (
    item_status IN ('IN_USE', 'RARELY_USED', 'STORED', 'TO_SELL')
  )
);

CREATE INDEX IF NOT EXISTS ix_wardrobe_item_preferences_user_favorite
  ON wardrobe_item_preferences (user_id, is_favorite);

CREATE INDEX IF NOT EXISTS ix_wardrobe_item_preferences_user_status
  ON wardrobe_item_preferences (user_id, item_status);
