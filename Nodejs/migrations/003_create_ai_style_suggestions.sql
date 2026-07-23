CREATE TABLE IF NOT EXISTS ai_style_suggestions (
  style_suggestion_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  weather_snapshot_id BIGINT REFERENCES weather_snapshots(weather_snapshot_id) ON DELETE SET NULL,
  calendar_event_id BIGINT REFERENCES calendar_events(event_id) ON DELETE SET NULL,
  model_name VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'GENERATED',
  suggestion_date DATE NOT NULL,
  title VARCHAR(160) NOT NULL,
  occasion VARCHAR(100),
  summary TEXT,
  reason TEXT,
  confidence NUMERIC(4,3),
  tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_response JSONB,
  error_message TEXT,
  confirmed_daily_outfit_id BIGINT REFERENCES daily_outfits(daily_outfit_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_ai_style_suggestions_status CHECK (status IN ('GENERATED', 'CONFIRMED', 'DISMISSED', 'FAILED'))
);

CREATE TABLE IF NOT EXISTS ai_style_suggestion_items (
  style_suggestion_item_id BIGSERIAL PRIMARY KEY,
  style_suggestion_id BIGINT NOT NULL REFERENCES ai_style_suggestions(style_suggestion_id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES wardrobe_items(item_id) ON DELETE CASCADE,
  slot_name VARCHAR(50) NOT NULL,
  reason TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ai_style_suggestion_items_suggestion_item UNIQUE (style_suggestion_id, item_id),
  CONSTRAINT ck_ai_style_suggestion_items_slot CHECK (
    slot_name IN ('TOP', 'BOTTOM', 'DRESS', 'SHOES', 'BAG', 'ACCESSORY', 'OUTERWEAR', 'OTHER')
  )
);

CREATE INDEX IF NOT EXISTS ix_ai_style_suggestions_user_date
  ON ai_style_suggestions (user_id, suggestion_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_ai_style_suggestions_user_status
  ON ai_style_suggestions (user_id, status);

CREATE INDEX IF NOT EXISTS ix_ai_style_suggestion_items_suggestion
  ON ai_style_suggestion_items (style_suggestion_id, sort_order);
