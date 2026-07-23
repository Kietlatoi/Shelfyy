CREATE TABLE weather_snapshots (
    weather_snapshot_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    timezone VARCHAR(100),
    location_label VARCHAR(255),
    temperature_celsius NUMERIC(5,2) NOT NULL,
    apparent_temperature_celsius NUMERIC(5,2),
    relative_humidity INT,
    precipitation_mm NUMERIC(8,2),
    rain_mm NUMERIC(8,2),
    weather_code INT,
    condition_text VARCHAR(120) NOT NULL,
    cloud_cover INT,
    wind_speed_kmh NUMERIC(6,2),
    wind_direction_deg INT,
    wind_gusts_kmh NUMERIC(6,2),
    is_day BOOLEAN,
    provider VARCHAR(50) NOT NULL DEFAULT 'OPEN_METEO',
    observed_at TIMESTAMPTZ NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_weather_snapshots_user_created ON weather_snapshots(user_id, created_at DESC);
CREATE INDEX ix_weather_snapshots_user_observed ON weather_snapshots(user_id, observed_at DESC);
