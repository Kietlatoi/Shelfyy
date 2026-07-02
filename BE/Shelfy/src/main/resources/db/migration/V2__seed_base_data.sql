CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO roles (
    role_name,
    description
)
VALUES
    ('USER', 'Regular user'),
    ('ADMIN', 'Administrator')
    ON CONFLICT (role_name) DO NOTHING;

INSERT INTO permissions (
    permission_code,
    description
)
VALUES
    ('WARDROBE_READ', 'Read wardrobe'),
    ('WARDROBE_CREATE', 'Create wardrobe item'),
    ('WARDROBE_UPDATE', 'Update wardrobe item'),
    ('WARDROBE_DELETE', 'Delete wardrobe item'),
    ('OUTFIT_CREATE', 'Create outfit'),
    ('TRY_ON_USE', 'Use AI try-on'),
    ('SUBSCRIPTION_MANAGE', 'Manage subscription'),
    ('AUDIT_READ', 'Read audit logs'),
    ('USER_MANAGE', 'Manage users')
    ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    r.role_id,
    p.permission_id
FROM roles r
         JOIN permissions p ON p.permission_code IN (
                                                     'WARDROBE_READ',
                                                     'WARDROBE_CREATE',
                                                     'WARDROBE_UPDATE',
                                                     'WARDROBE_DELETE',
                                                     'OUTFIT_CREATE',
                                                     'TRY_ON_USE',
                                                     'SUBSCRIPTION_MANAGE'
    )
WHERE r.role_name = 'USER'
    ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    r.role_id,
    p.permission_id
FROM roles r
         CROSS JOIN permissions p
WHERE r.role_name = 'ADMIN'
    ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO plans (
    plan_name,
    display_name,
    price,
    currency,
    duration_days,
    try_on_limit_per_month,
    wardrobe_limit,
    features,
    is_active
)
VALUES
    ('FREE', 'Miễn phí', 0, 'VND', 30, 5, 100, 'Free plan', TRUE),
    ('PRO', 'Gói Pro', 59000, 'VND', 30, 100, NULL, 'Pro monthly plan', TRUE),
    ('PREMIUM', 'Gói Premium', 590000, 'VND', 365, 100, NULL, 'Premium yearly plan', TRUE)
    ON CONFLICT (plan_name) DO NOTHING;

INSERT INTO users (
    full_name,
    email,
    status,
    email_verified,
    phone_verified,
    plan,
    plan_expires_at,
    storage_used,
    storage_limit,
    try_on_count_today,
    try_on_limit,
    try_on_reset_at,
    created_at,
    updated_at
)
VALUES
    (
        'Shelfy Admin',
        'admin@shelfy.app',
        'ACTIVE',
        TRUE,
        FALSE,
        'PREMIUM',
        NOW() + INTERVAL '365 days',
        0,
        -1,
        0,
        100,
        NOW(),
        NOW(),
        NOW()
    ),
    (
        'Demo User',
        'demo@shelfy.app',
        'ACTIVE',
        TRUE,
        FALSE,
        'FREE',
        NULL,
        0,
        100,
        0,
        5,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
    full_name           = EXCLUDED.full_name,
                               status              = EXCLUDED.status,
                               email_verified      = EXCLUDED.email_verified,
                               phone_verified      = EXCLUDED.phone_verified,
                               plan                = EXCLUDED.plan,
                               plan_expires_at     = EXCLUDED.plan_expires_at,
                               storage_used        = EXCLUDED.storage_used,
                               storage_limit       = EXCLUDED.storage_limit,
                               try_on_count_today  = EXCLUDED.try_on_count_today,
                               try_on_limit        = EXCLUDED.try_on_limit,
                               try_on_reset_at     = EXCLUDED.try_on_reset_at,
                               updated_at          = NOW();

INSERT INTO auth_credentials (
    user_id,
    password_hash,
    password_algo,
    password_changed_at,
    must_change_password,
    failed_login_count
)
SELECT
    u.user_id,
    crypt('123456', gen_salt('bf', 10)),
    'BCRYPT',
    NOW(),
    FALSE,
    0
FROM users u
WHERE u.email = 'admin@shelfy.app'
    ON CONFLICT (user_id) DO UPDATE SET
    password_hash        = EXCLUDED.password_hash,
                                 password_algo        = EXCLUDED.password_algo,
                                 password_changed_at  = NOW(),
                                 must_change_password = FALSE,
                                 failed_login_count   = 0;

INSERT INTO auth_credentials (
    user_id,
    password_hash,
    password_algo,
    password_changed_at,
    must_change_password,
    failed_login_count
)
SELECT
    u.user_id,
    crypt('123456', gen_salt('bf', 10)),
    'BCRYPT',
    NOW(),
    FALSE,
    0
FROM users u
WHERE u.email = 'user@shelfy.app'
    ON CONFLICT (user_id) DO UPDATE SET
    password_hash        = EXCLUDED.password_hash,
                                 password_algo        = EXCLUDED.password_algo,
                                 password_changed_at  = NOW(),
                                 must_change_password = FALSE,
                                 failed_login_count   = 0;

INSERT INTO user_roles (
    user_id,
    role_id,
    assigned_at
)
SELECT
    u.user_id,
    r.role_id,
    NOW()
FROM users u
         JOIN roles r ON r.role_name = 'ADMIN'
WHERE u.email = 'admin@shelfy.app'
    ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (
    user_id,
    role_id,
    assigned_at
)
SELECT
    u.user_id,
    r.role_id,
    NOW()
FROM users u
         JOIN roles r ON r.role_name = 'USER'
WHERE u.email = 'demo@shelfy.app'
    ON CONFLICT (user_id, role_id) DO NOTHING;