CREATE TABLE calendar_connections (
    calendar_connection_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'GOOGLE',
    provider_account_id VARCHAR(255),
    provider_email VARCHAR(255),
    scope TEXT NOT NULL,
    access_token_ciphertext TEXT,
    refresh_token_ciphertext TEXT,
    token_expires_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_calendar_connections_user_provider UNIQUE (user_id, provider)
);

CREATE TABLE calendar_oauth_states (
    calendar_oauth_state_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    state_hash CHAR(64) NOT NULL UNIQUE,
    redirect_after VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_calendar_connections_user_provider_active
    ON calendar_connections(user_id, provider)
    WHERE disconnected_at IS NULL;

CREATE INDEX ix_calendar_oauth_states_user_created
    ON calendar_oauth_states(user_id, created_at DESC);

CREATE INDEX ix_calendar_oauth_states_expires
    ON calendar_oauth_states(expires_at);

CREATE UNIQUE INDEX uq_calendar_events_user_google_event
    ON calendar_events(user_id, google_calendar_id, google_event_id)
    WHERE google_event_id IS NOT NULL;

CREATE TRIGGER trg_calendar_connections_updated_at
    BEFORE UPDATE ON calendar_connections
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
