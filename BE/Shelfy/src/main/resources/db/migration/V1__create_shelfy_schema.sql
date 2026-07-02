CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
                       user_id BIGSERIAL PRIMARY KEY,
                       public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
                       full_name VARCHAR(100) NOT NULL,
                       email VARCHAR(255) NOT NULL UNIQUE,
                       phone VARCHAR(20),
                       avatar_file_id BIGINT,
                       status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
                       email_verified BOOLEAN NOT NULL DEFAULT FALSE,
                       phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
                       plan VARCHAR(20) NOT NULL DEFAULT 'FREE',
                       plan_expires_at TIMESTAMP,
                       storage_used INT NOT NULL DEFAULT 0,
                       storage_limit INT NOT NULL DEFAULT 100,
                       try_on_count_today INT NOT NULL DEFAULT 0,
                       try_on_limit INT NOT NULL DEFAULT 5,
                       try_on_reset_at TIMESTAMP,
                       created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                       updated_at TIMESTAMP DEFAULT NOW(),
                       deleted_at TIMESTAMP,
                       CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE','BANNED','LOCKED','DELETED'))
);

CREATE TABLE auth_credentials (
                                  credential_id BIGSERIAL PRIMARY KEY,
                                  user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
                                  password_hash VARCHAR(255) NOT NULL,
                                  password_algo VARCHAR(50) NOT NULL DEFAULT 'BCRYPT',
                                  password_changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
                                  failed_login_count INT NOT NULL DEFAULT 0,
                                  locked_until TIMESTAMP,
                                  last_login_at TIMESTAMP,
                                  CONSTRAINT ck_auth_algo CHECK (password_algo IN ('BCRYPT','ARGON2ID','PBKDF2'))
);

CREATE TABLE roles (
                       role_id BIGSERIAL PRIMARY KEY,
                       role_name VARCHAR(50) NOT NULL UNIQUE,
                       description VARCHAR(255)
);

CREATE TABLE permissions (
                             permission_id BIGSERIAL PRIMARY KEY,
                             permission_code VARCHAR(100) NOT NULL UNIQUE,
                             description VARCHAR(255)
);

CREATE TABLE user_roles (
                            user_role_id BIGSERIAL PRIMARY KEY,
                            user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                            role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
                            assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
                            CONSTRAINT uq_user_roles UNIQUE(user_id, role_id)
);

CREATE TABLE role_permissions (
                                  role_permission_id BIGSERIAL PRIMARY KEY,
                                  role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
                                  permission_id BIGINT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
                                  CONSTRAINT uq_role_permissions UNIQUE(role_id, permission_id)
);

CREATE TABLE refresh_tokens (
                                refresh_token_id BIGSERIAL PRIMARY KEY,
                                user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                                token_hash VARCHAR(255) NOT NULL UNIQUE,
                                device_info VARCHAR(255),
                                ip_address VARCHAR(45),
                                user_agent VARCHAR(500),
                                issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                expires_at TIMESTAMP NOT NULL,
                                revoked_at TIMESTAMP,
                                replaced_by_token_hash VARCHAR(255)
);

CREATE TABLE login_attempts (
                                attempt_id BIGSERIAL PRIMARY KEY,
                                email VARCHAR(255),
                                user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
                                ip_address VARCHAR(45),
                                user_agent VARCHAR(500),
                                success BOOLEAN NOT NULL,
                                failure_reason VARCHAR(100),
                                created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE email_verification_tokens (
                                           verification_id BIGSERIAL PRIMARY KEY,
                                           user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                                           token_hash VARCHAR(255) NOT NULL UNIQUE,
                                           expires_at TIMESTAMP NOT NULL,
                                           used_at TIMESTAMP,
                                           created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
                                       reset_id BIGSERIAL PRIMARY KEY,
                                       user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                                       token_hash VARCHAR(255) NOT NULL UNIQUE,
                                       expires_at TIMESTAMP NOT NULL,
                                       used_at TIMESTAMP,
                                       created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE mfa_methods (
                             mfa_id BIGSERIAL PRIMARY KEY,
                             user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                             method_type VARCHAR(30) NOT NULL,
                             secret_encrypted VARCHAR(500),
                             is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                             created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                             last_used_at TIMESTAMP,
                             CONSTRAINT ck_mfa_method CHECK(method_type IN ('EMAIL_OTP','SMS_OTP','TOTP','AUTHENTICATOR_APP')),
                             CONSTRAINT uq_mfa_user_method UNIQUE(user_id, method_type)
);

CREATE TABLE user_sessions (
                               session_id BIGSERIAL PRIMARY KEY,
                               user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                               session_token_hash VARCHAR(255) NOT NULL UNIQUE,
                               ip_address VARCHAR(45),
                               user_agent VARCHAR(500),
                               created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                               expires_at TIMESTAMP NOT NULL,
                               revoked_at TIMESTAMP
);

CREATE TABLE file_assets (
                             file_id BIGSERIAL PRIMARY KEY,
                             owner_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                             file_url VARCHAR(1000) NOT NULL,
                             object_key VARCHAR(500),
                             file_type VARCHAR(50) NOT NULL,
                             mime_type VARCHAR(100) NOT NULL,
                             file_size BIGINT,
                             visibility VARCHAR(30) NOT NULL DEFAULT 'PRIVATE',
                             checksum VARCHAR(255),
                             uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
                             deleted_at TIMESTAMP,
                             CONSTRAINT ck_file_type CHECK(file_type IN ('AVATAR','WARDROBE_ITEM','TRY_ON_INPUT','TRY_ON_RESULT','OUTFIT_IMAGE','OTHER')),
                             CONSTRAINT ck_file_visibility CHECK(visibility IN ('PRIVATE','PUBLIC','SIGNED_URL_ONLY'))
);

ALTER TABLE users ADD CONSTRAINT fk_users_avatar_file FOREIGN KEY (avatar_file_id) REFERENCES file_assets(file_id);

CREATE TABLE user_profiles (
                               profile_id BIGSERIAL PRIMARY KEY,
                               user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
                               gender VARCHAR(20),
                               height_cm INT,
                               weight_kg INT,
                               body_shape VARCHAR(50),
                               skin_tone VARCHAR(50),
                               style_preference VARCHAR(255),
                               favorite_colors VARCHAR(255),
                               privacy_ai_training_consent BOOLEAN NOT NULL DEFAULT FALSE,
                               created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                               updated_at TIMESTAMP DEFAULT NOW(),
                               CONSTRAINT ck_profile_gender CHECK(gender IS NULL OR gender IN ('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY'))
);

CREATE TABLE wardrobe_items (
                                item_id BIGSERIAL PRIMARY KEY,
                                user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                                image_file_id BIGINT REFERENCES file_assets(file_id),
                                category VARCHAR(50) NOT NULL,
                                brand VARCHAR(100),
                                item_name VARCHAR(150) NOT NULL,
                                size VARCHAR(30),
                                material VARCHAR(100),
                                color VARCHAR(50),
                                color_hex VARCHAR(20),
                                season VARCHAR(50),
                                pattern VARCHAR(100),
                                sub_category VARCHAR(100),
                                thumbnail_url VARCHAR(1000),
                                background_removed_url VARCHAR(1000),
                                tags TEXT,
                                wear_count INT NOT NULL DEFAULT 0,
                                last_worn_at TIMESTAMP,
                                purchase_price NUMERIC(12,0),
                                purchase_date DATE,
                                source_url TEXT,
                                ai_detected BOOLEAN NOT NULL DEFAULT FALSE,
                                is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
                                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                updated_at TIMESTAMP DEFAULT NOW(),
                                deleted_at TIMESTAMP,
                                CONSTRAINT ck_wardrobe_category CHECK(category IN ('TOP','BOTTOM','DRESS','SHOES','BAG','ACCESSORY','OUTERWEAR','OTHER'))
);

CREATE TABLE outfits (
                         outfit_id BIGSERIAL PRIMARY KEY,
                         user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                         image_file_id BIGINT REFERENCES file_assets(file_id),
                         outfit_name VARCHAR(150) NOT NULL,
                         description VARCHAR(500),
                         style VARCHAR(100),
                         occasion VARCHAR(100),
                         weather_condition VARCHAR(100),
                         temperature_min NUMERIC(5,2),
                         temperature_max NUMERIC(5,2),
                         source VARCHAR(30) NOT NULL DEFAULT 'USER_CREATED',
                         is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
                         created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                         updated_at TIMESTAMP DEFAULT NOW(),
                         deleted_at TIMESTAMP,
                         CONSTRAINT ck_outfit_source CHECK(source IN ('USER_CREATED','AI_SUGGESTED'))
);

CREATE TABLE outfit_items (
                              outfit_item_id BIGSERIAL PRIMARY KEY,
                              outfit_id BIGINT NOT NULL REFERENCES outfits(outfit_id) ON DELETE CASCADE,
                              item_id BIGINT NOT NULL REFERENCES wardrobe_items(item_id) ON DELETE CASCADE,
                              slot_name VARCHAR(50) NOT NULL,
                              CONSTRAINT ck_outfit_slot CHECK(slot_name IN ('TOP','BOTTOM','DRESS','SHOES','BAG','ACCESSORY','OUTERWEAR','OTHER')),
                              CONSTRAINT uq_outfit_items_slot UNIQUE(outfit_id, item_id, slot_name)
);

CREATE TABLE calendar_events (
                                 event_id BIGSERIAL PRIMARY KEY,
                                 user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                                 event_title VARCHAR(255) NOT NULL,
                                 event_start TIMESTAMP NOT NULL,
                                 event_end TIMESTAMP,
                                 location VARCHAR(255),
                                 description TEXT,
                                 context VARCHAR(50),
                                 google_event_id VARCHAR(255),
                                 google_calendar_id VARCHAR(255),
                                 last_synced_at TIMESTAMP,
                                 selected_outfit_id BIGINT REFERENCES outfits(outfit_id),
                                 created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                 updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_suggestions (
                                suggestion_id BIGSERIAL PRIMARY KEY,
                                user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                                outfit_id BIGINT REFERENCES outfits(outfit_id) ON DELETE SET NULL,
                                calendar_event_id BIGINT REFERENCES calendar_events(event_id) ON DELETE SET NULL,
                                suggestion_date DATE NOT NULL,
                                weather_condition VARCHAR(100),
                                temperature_celsius NUMERIC(5,2),
                                context VARCHAR(50),
                                display_order INT NOT NULL DEFAULT 1,
                                ai_advice TEXT,
                                style_tags VARCHAR(300),
                                is_favorited BOOLEAN NOT NULL DEFAULT FALSE,
                                is_skipped BOOLEAN NOT NULL DEFAULT FALSE,
                                created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE try_on_sessions (
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
                                 deleted_at TIMESTAMP,
                                 created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                 completed_at TIMESTAMP,
                                 CONSTRAINT ck_tryon_status CHECK(status IN ('PENDING','PROCESSING','COMPLETED','FAILED'))
);

CREATE TABLE plans (
                       plan_id BIGSERIAL PRIMARY KEY,
                       plan_name VARCHAR(50) NOT NULL UNIQUE,
                       display_name VARCHAR(100) NOT NULL,
                       price NUMERIC(12,2) NOT NULL DEFAULT 0,
                       currency VARCHAR(10) NOT NULL DEFAULT 'VND',
                       duration_days INT NOT NULL,
                       try_on_limit_per_month INT,
                       wardrobe_limit INT,
                       features TEXT,
                       is_active BOOLEAN NOT NULL DEFAULT TRUE,
                       created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
                               subscription_id BIGSERIAL PRIMARY KEY,
                               user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                               plan_id BIGINT NOT NULL REFERENCES plans(plan_id),
                               start_date TIMESTAMP NOT NULL,
                               end_date TIMESTAMP NOT NULL,
                               status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                               auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
                               created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                               cancelled_at TIMESTAMP,
                               CONSTRAINT ck_subscription_status CHECK(status IN ('ACTIVE','EXPIRED','CANCELLED','PENDING'))
);

CREATE TABLE payments (
                          payment_id BIGSERIAL PRIMARY KEY,
                          user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                          subscription_id BIGINT REFERENCES subscriptions(subscription_id) ON DELETE SET NULL,
                          amount NUMERIC(12,2) NOT NULL,
                          currency VARCHAR(10) NOT NULL DEFAULT 'VND',
                          payment_method VARCHAR(50) NOT NULL DEFAULT 'VNPAY',
                          payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                          transaction_code VARCHAR(255),
                          provider_response TEXT,
                          paid_at TIMESTAMP,
                          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                          CONSTRAINT ck_payment_method CHECK(payment_method IN ('MOMO','VNPAY','BANKING','CARD','CASH','OTHER')),
                          CONSTRAINT ck_payment_status CHECK(payment_status IN ('PENDING','SUCCESS','FAILED','REFUNDED','CANCELLED'))
);

CREATE TABLE audit_logs (
                            audit_id BIGSERIAL PRIMARY KEY,
                            actor_user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
                            action VARCHAR(100) NOT NULL,
                            entity_name VARCHAR(100),
                            entity_id BIGINT,
                            ip_address VARCHAR(45),
                            user_agent VARCHAR(500),
                            old_value TEXT,
                            new_value TEXT,
                            created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_users_status ON users(status);
CREATE INDEX ix_users_created_at ON users(created_at);
CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX ix_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX ix_login_attempts_email ON login_attempts(email);
CREATE INDEX ix_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX ix_login_attempts_ip_created ON login_attempts(ip_address, created_at);
CREATE INDEX ix_file_assets_owner ON file_assets(owner_user_id);
CREATE INDEX ix_file_assets_type ON file_assets(file_type);
CREATE INDEX ix_wardrobe_items_user ON wardrobe_items(user_id);
CREATE INDEX ix_wardrobe_items_category ON wardrobe_items(category);
CREATE INDEX ix_wardrobe_items_favorite ON wardrobe_items(is_favorite);
CREATE INDEX ix_outfits_user ON outfits(user_id);
CREATE INDEX ix_outfits_source ON outfits(source);
CREATE INDEX ix_outfits_favorite ON outfits(is_favorite);
CREATE INDEX ix_outfit_items_outfit ON outfit_items(outfit_id);
CREATE INDEX ix_outfit_items_item ON outfit_items(item_id);
CREATE INDEX ix_calendar_user_id ON calendar_events(user_id);
CREATE INDEX ix_calendar_event_start ON calendar_events(event_start);
CREATE INDEX ix_calendar_google_event_id ON calendar_events(google_event_id);
CREATE INDEX ix_ai_suggestion_user_date ON ai_suggestions(user_id, suggestion_date);
CREATE INDEX ix_try_on_sessions_user ON try_on_sessions(user_id);
CREATE INDEX ix_try_on_sessions_status ON try_on_sessions(status);
CREATE INDEX ix_try_on_sessions_created_at ON try_on_sessions(created_at);
CREATE INDEX ix_subscriptions_user ON subscriptions(user_id);
CREATE INDEX ix_subscriptions_status ON subscriptions(status);
CREATE INDEX ix_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX ix_payments_user ON payments(user_id);
CREATE INDEX ix_payments_status ON payments(payment_status);
CREATE INDEX ix_payments_created_at ON payments(created_at);
CREATE INDEX ix_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX ix_audit_logs_action ON audit_logs(action);
CREATE INDEX ix_audit_logs_created_at ON audit_logs(created_at);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_wardrobe_items_updated_at BEFORE UPDATE ON wardrobe_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_outfits_updated_at BEFORE UPDATE ON outfits FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
