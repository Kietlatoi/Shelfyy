CREATE TABLE IF NOT EXISTS daily_outfits (
  daily_outfit_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  outfit_id BIGINT NOT NULL REFERENCES outfits(outfit_id) ON DELETE CASCADE,
  worn_date DATE NOT NULL,
  confirmed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  weather_snapshot_id BIGINT REFERENCES weather_snapshots(weather_snapshot_id) ON DELETE SET NULL,
  calendar_event_id BIGINT REFERENCES calendar_events(event_id) ON DELETE SET NULL,
  notes VARCHAR(500),
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_daily_outfits_user_worn_date UNIQUE (user_id, worn_date)
);

CREATE INDEX IF NOT EXISTS ix_daily_outfits_user_date
  ON daily_outfits (user_id, worn_date DESC);

CREATE INDEX IF NOT EXISTS ix_daily_outfits_outfit
  ON daily_outfits (outfit_id);

CREATE INDEX IF NOT EXISTS ix_daily_outfits_weather_snapshot
  ON daily_outfits (weather_snapshot_id);

CREATE INDEX IF NOT EXISTS ix_daily_outfits_calendar_event
  ON daily_outfits (calendar_event_id);
