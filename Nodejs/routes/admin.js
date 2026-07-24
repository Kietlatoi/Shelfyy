var express = require('express');
var { authenticate, requireAdmin } = require('../middleware/auth');
var { query, withTransaction } = require('../db');

var router = express.Router();
var USER_STATUSES = ['ACTIVE', 'BANNED', 'LOCKED'];
var USER_PLANS = ['FREE', 'PRO', 'PREMIUM'];
var PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'];
var SUBSCRIPTION_STATUSES = ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING'];
var WARDROBE_CATEGORIES = ['TOP', 'BOTTOM', 'DRESS', 'SHOES', 'BAG', 'ACCESSORY', 'OUTERWEAR', 'OTHER'];

function publicError(message, status, code) {
  var error = new Error(message);
  error.status = status || 400;
  error.code = code || 'ADMIN_REQUEST_ERROR';
  error.publicMessage = message;
  return error;
}

function parsePositiveId(value, fieldName) {
  var numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw publicError(fieldName + ' không hợp lệ.', 422, 'VALIDATION_ERROR');
  }
  return numeric;
}

function normalizePageParams(raw) {
  var page = Number(raw && raw.page !== undefined ? raw.page : 0);
  var size = Number(raw && raw.size !== undefined ? raw.size : 20);
  if (!Number.isInteger(page) || page < 0) {
    throw publicError('page phải là số nguyên không âm.', 422, 'VALIDATION_ERROR');
  }
  if (!Number.isInteger(size) || size < 1 || size > 100) {
    throw publicError('size phải nằm trong khoảng 1 đến 100.', 422, 'VALIDATION_ERROR');
  }
  return { page: page, size: size, offset: page * size };
}

function normalizeQueryText(value, maxLength) {
  var text = String(value || '').trim();
  if (!text) return '';
  return text.slice(0, maxLength || 120);
}

function normalizeEnum(value, allowed, fieldName, allowEmpty) {
  if ((value === undefined || value === null || value === '') && allowEmpty) return '';
  var normalized = String(value || '').trim().toUpperCase();
  if (!allowed.includes(normalized)) {
    throw publicError(fieldName + ' không hợp lệ.', 422, 'VALIDATION_ERROR');
  }
  return normalized;
}

function normalizeOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  var text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw publicError(fieldName + ' phải có định dạng YYYY-MM-DD.', 422, 'VALIDATION_ERROR');
  }
  var parsed = new Date(text + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw publicError(fieldName + ' không hợp lệ.', 422, 'VALIDATION_ERROR');
  }
  return text;
}

function normalizeOptionalInteger(value, fieldName, minValue) {
  if (value === undefined || value === null || value === '') return null;
  var numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < minValue) {
    throw publicError(fieldName + ' không hợp lệ.', 422, 'VALIDATION_ERROR');
  }
  return numeric;
}

function addDays(date, days) {
  return new Date(date.getTime() + Number(days || 0) * 24 * 60 * 60 * 1000);
}

function asNumber(value) {
  if (value === null || value === undefined) return 0;
  return Number(value) || 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeRate(part, total) {
  var denominator = asNumber(total);
  if (!denominator) return 0;
  return Math.round((asNumber(part) / denominator) * 1000) / 10;
}

function normalizeAnalyticsDays(value) {
  if (value === undefined || value === null || value === '') return 30;
  var numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 7 || numeric > 180) {
    throw publicError('days phải là số nguyên từ 7 đến 180.', 422, 'VALIDATION_ERROR');
  }
  return numeric;
}

function chartPoint(row) {
  return {
    date: row.date,
    value: asNumber(row.value),
  };
}

function clientIp(req) {
  var forwarded = req.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket && req.socket.remoteAddress || '127.0.0.1';
}

function pageResponse(rows, total, pageParams) {
  var totalElements = asNumber(total);
  var totalPages = Math.ceil(totalElements / pageParams.size);
  return {
    content: rows,
    page: pageParams.page,
    size: pageParams.size,
    totalElements: totalElements,
    totalPages: totalPages,
    first: pageParams.page === 0,
    last: pageParams.page + 1 >= totalPages,
  };
}

async function writeAudit(client, req, action, entityName, entityId, oldValue, newValue) {
  await client.query(
    `INSERT INTO audit_logs (
       actor_user_id, action, entity_name, entity_id, ip_address, user_agent, old_value, new_value, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      req.user.userId,
      action,
      entityName || null,
      entityId || null,
      clientIp(req),
      (req.get('user-agent') || '').slice(0, 500),
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
    ]
  );
}

function userSummary(row) {
  return {
    id: Number(row.user_id),
    publicId: row.public_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    plan: row.plan,
    planExpiresAt: row.plan_expires_at,
    storageUsed: asNumber(row.storage_used),
    storageLimit: row.storage_limit === null ? null : Number(row.storage_limit),
    tryOnCountToday: asNumber(row.try_on_count_today),
    tryOnLimit: asNumber(row.try_on_limit),
    roles: asArray(row.roles),
    wardrobeCount: asNumber(row.wardrobe_count),
    dailyOutfitCount: asNumber(row.daily_outfit_count),
    paymentCount: asNumber(row.payment_count),
    totalPaid: asNumber(row.total_paid),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildUserFilters(raw, params) {
  var where = ['u.deleted_at IS NULL'];
  var q = normalizeQueryText(raw.q, 120);
  var status = raw.status ? normalizeEnum(raw.status, USER_STATUSES, 'status', false) : '';
  var plan = raw.plan ? normalizeEnum(raw.plan, USER_PLANS, 'plan', false) : '';
  var role = normalizeQueryText(raw.role, 50).toUpperCase();

  if (q) {
    params.push('%' + q.toLowerCase() + '%');
    where.push('(LOWER(u.email) LIKE $' + params.length + ' OR LOWER(u.full_name) LIKE $' + params.length + ')');
  }
  if (status) {
    params.push(status);
    where.push('u.status = $' + params.length);
  }
  if (plan) {
    params.push(plan);
    where.push('u.plan = $' + params.length);
  }
  if (role) {
    params.push(role);
    where.push(
      `EXISTS (
         SELECT 1
         FROM user_roles ur_filter
         JOIN roles r_filter ON r_filter.role_id = ur_filter.role_id
         WHERE ur_filter.user_id = u.user_id
           AND r_filter.role_name = $` + params.length + `
       )`
    );
  }
  return where.join(' AND ');
}

function planDefaults(plan, body) {
  var expiresAt = body && body.planExpiresAt !== undefined ? normalizeOptionalDate(body.planExpiresAt, 'planExpiresAt') : null;
  var storageLimit = normalizeOptionalInteger(body && body.storageLimit, 'storageLimit', -1);
  var tryOnLimit = normalizeOptionalInteger(body && body.tryOnLimit, 'tryOnLimit', 0);

  if (plan === 'FREE') {
    return {
      planExpiresAt: null,
      storageLimit: storageLimit === null ? 100 : storageLimit,
      tryOnLimit: tryOnLimit === null ? 5 : tryOnLimit,
    };
  }

  if (!expiresAt) {
    expiresAt = addDays(new Date(), plan === 'PREMIUM' ? 365 : 30);
  } else {
    expiresAt = new Date(expiresAt + 'T23:59:59Z');
  }

  return {
    planExpiresAt: expiresAt,
    storageLimit: storageLimit === null ? -1 : storageLimit,
    tryOnLimit: tryOnLimit === null ? 100 : tryOnLimit,
  };
}

function wardrobeItemResponse(row) {
  return {
    id: Number(row.item_id),
    userId: Number(row.user_id),
    ownerName: row.full_name,
    ownerEmail: row.email,
    name: row.item_name,
    brand: row.brand,
    category: row.category,
    color: row.color,
    colorHex: row.color_hex,
    season: row.season,
    pattern: row.pattern,
    material: row.material,
    size: row.size,
    thumbnailUrl: row.thumbnail_url,
    backgroundRemovedUrl: row.background_removed_url,
    favorite: Boolean(row.is_favorite),
    preferenceStatus: row.item_status || 'IN_USE',
    wearCount: asNumber(row.wear_count),
    lastWornAt: row.last_worn_at,
    createdAt: row.created_at,
  };
}

function paymentResponse(row) {
  return {
    id: Number(row.payment_id),
    userId: Number(row.user_id),
    userName: row.full_name,
    userEmail: row.email,
    subscriptionId: row.subscription_id == null ? null : Number(row.subscription_id),
    planType: row.plan_type,
    amount: asNumber(row.amount),
    currency: row.currency,
    method: row.payment_method,
    status: row.payment_status,
    transactionCode: row.transaction_code,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

function subscriptionResponse(row) {
  return {
    id: Number(row.subscription_id),
    userId: Number(row.user_id),
    userName: row.full_name,
    userEmail: row.email,
    planId: Number(row.plan_id),
    planName: row.plan_name,
    displayName: row.display_name,
    price: asNumber(row.price),
    currency: row.currency,
    status: row.status,
    autoRenew: Boolean(row.auto_renew),
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  };
}

function auditResponse(row) {
  return {
    id: Number(row.audit_id),
    actorUserId: row.actor_user_id == null ? null : Number(row.actor_user_id),
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    action: row.action,
    entityName: row.entity_name,
    entityId: row.entity_id == null ? null : Number(row.entity_id),
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    oldValue: row.old_value,
    newValue: row.new_value,
    createdAt: row.created_at,
  };
}

router.use(authenticate, requireAdmin);

router.get('/me', async function(req, res) {
  res.json({
    user: {
      id: req.user.userId,
      publicId: req.user.publicId,
      email: req.user.email,
      fullName: req.user.fullName,
    },
    roles: req.user.roles || [],
    permissions: req.user.permissions || [],
  });
});

router.get('/overview', async function(req, res, next) {
  try {
    var results = await Promise.all([
      query(
        `SELECT COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_users,
                COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'ACTIVE') AS active_users,
                COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'LOCKED') AS locked_users,
                COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'BANNED') AS banned_users,
                COUNT(*) FILTER (WHERE deleted_at IS NULL AND plan <> 'FREE') AS paid_users
         FROM users`
      ),
      query(
        `SELECT COUNT(*) AS total_items,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_items_7d,
                COUNT(*) FILTER (WHERE category = 'TOP') AS tops,
                COUNT(*) FILTER (WHERE category = 'BOTTOM') AS bottoms,
                COUNT(*) FILTER (WHERE category = 'DRESS') AS dresses,
                COUNT(*) FILTER (WHERE category IN ('SHOES', 'BAG', 'ACCESSORY')) AS accessories
         FROM wardrobe_items
         WHERE deleted_at IS NULL`
      ),
      query(
        `SELECT COUNT(*) AS total_payments,
                COUNT(*) FILTER (WHERE payment_status = 'SUCCESS') AS successful_payments,
                COUNT(*) FILTER (WHERE payment_status = 'PENDING') AS pending_payments,
                COUNT(*) FILTER (WHERE payment_status = 'FAILED') AS failed_payments,
                COALESCE(SUM(amount) FILTER (WHERE payment_status = 'SUCCESS'), 0) AS revenue
         FROM payments`
      ),
      query(
        `SELECT COUNT(*) AS total_subscriptions,
                COUNT(*) FILTER (WHERE status = 'ACTIVE' AND end_date > NOW()) AS active_subscriptions,
                COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_subscriptions,
                COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_subscriptions
         FROM subscriptions`
      ),
      query(
        `SELECT COUNT(*) AS daily_outfits,
                COUNT(*) FILTER (WHERE worn_date >= CURRENT_DATE - INTERVAL '7 days') AS daily_outfits_7d
         FROM daily_outfits`
      ),
      query(
        `SELECT COUNT(*) AS trial_jobs,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_trials,
                COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_trials,
                COUNT(*) FILTER (WHERE is_saved = TRUE) AS saved_trials
         FROM node_try_on_sessions`
      ),
      query(
        `SELECT COUNT(*) FILTER (WHERE disconnected_at IS NULL) AS connected_calendars,
                COUNT(*) FILTER (WHERE disconnected_at IS NOT NULL) AS disconnected_calendars
         FROM calendar_connections`
      ),
      query(
        `SELECT DATE(created_at) AS date, COUNT(*) AS users
         FROM users
         WHERE deleted_at IS NULL
           AND created_at >= CURRENT_DATE - INTERVAL '13 days'
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at)`
      ),
      query(
        `SELECT DATE(created_at) AS date, COALESCE(SUM(amount) FILTER (WHERE payment_status = 'SUCCESS'), 0) AS revenue
         FROM payments
         WHERE created_at >= CURRENT_DATE - INTERVAL '13 days'
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at)`
      ),
    ]);

    res.json({
      users: {
        total: asNumber(results[0].rows[0].total_users),
        active: asNumber(results[0].rows[0].active_users),
        locked: asNumber(results[0].rows[0].locked_users),
        banned: asNumber(results[0].rows[0].banned_users),
        paid: asNumber(results[0].rows[0].paid_users),
      },
      wardrobe: {
        totalItems: asNumber(results[1].rows[0].total_items),
        newItems7d: asNumber(results[1].rows[0].new_items_7d),
        categories: {
          tops: asNumber(results[1].rows[0].tops),
          bottoms: asNumber(results[1].rows[0].bottoms),
          dresses: asNumber(results[1].rows[0].dresses),
          accessories: asNumber(results[1].rows[0].accessories),
        },
      },
      payments: {
        total: asNumber(results[2].rows[0].total_payments),
        success: asNumber(results[2].rows[0].successful_payments),
        pending: asNumber(results[2].rows[0].pending_payments),
        failed: asNumber(results[2].rows[0].failed_payments),
        revenue: asNumber(results[2].rows[0].revenue),
      },
      subscriptions: {
        total: asNumber(results[3].rows[0].total_subscriptions),
        active: asNumber(results[3].rows[0].active_subscriptions),
        pending: asNumber(results[3].rows[0].pending_subscriptions),
        cancelled: asNumber(results[3].rows[0].cancelled_subscriptions),
      },
      engagement: {
        dailyOutfits: asNumber(results[4].rows[0].daily_outfits),
        dailyOutfits7d: asNumber(results[4].rows[0].daily_outfits_7d),
        trialJobs: asNumber(results[5].rows[0].trial_jobs),
        completedTrials: asNumber(results[5].rows[0].completed_trials),
        failedTrials: asNumber(results[5].rows[0].failed_trials),
        savedTrials: asNumber(results[5].rows[0].saved_trials),
        connectedCalendars: asNumber(results[6].rows[0].connected_calendars),
        disconnectedCalendars: asNumber(results[6].rows[0].disconnected_calendars),
      },
      charts: {
        usersByDay: results[7].rows.map(function(row) {
          return { date: row.date, value: asNumber(row.users) };
        }),
        revenueByDay: results[8].rows.map(function(row) {
          return { date: row.date, value: asNumber(row.revenue) };
        }),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics', async function(req, res, next) {
  try {
    var days = normalizeAnalyticsDays(req.query.days);
    var tryOnCostUsd = asNumber(process.env.ADMIN_TRY_ON_COST_USD || process.env.TRY_ON_ESTIMATED_COST_USD);
    var suggestionCostUsd = asNumber(process.env.ADMIN_SUGGESTION_COST_USD || process.env.SUGGESTION_ESTIMATED_COST_USD);

    var activeEventsCte = `
      SELECT user_id, created_at AS activity_at FROM login_attempts WHERE success = TRUE AND user_id IS NOT NULL
      UNION ALL
      SELECT user_id, created_at AS activity_at FROM wardrobe_items WHERE deleted_at IS NULL
      UNION ALL
      SELECT user_id, confirmed_at AS activity_at FROM daily_outfits
      UNION ALL
      SELECT user_id, created_at AS activity_at FROM node_try_on_sessions WHERE deleted_at IS NULL
      UNION ALL
      SELECT user_id, created_at AS activity_at FROM payments
      UNION ALL
      SELECT user_id, connected_at AS activity_at FROM calendar_connections
    `;

    var results = await Promise.all([
      query(
        `WITH paid AS (
           SELECT DISTINCT user_id FROM payments WHERE payment_status = 'SUCCESS'
         ),
         active AS (
           SELECT DISTINCT user_id
           FROM (` + activeEventsCte + `) events
           WHERE activity_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
         )
         SELECT COUNT(*) FILTER (WHERE u.deleted_at IS NULL) AS total_users,
                COUNT(*) FILTER (
                  WHERE u.deleted_at IS NULL
                    AND u.created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
                ) AS new_users,
                COUNT(DISTINCT active.user_id) AS active_users,
                COUNT(*) FILTER (
                  WHERE u.deleted_at IS NULL
                    AND (u.plan <> 'FREE' OR paid.user_id IS NOT NULL)
                ) AS paid_users
         FROM users u
         LEFT JOIN paid ON paid.user_id = u.user_id
         LEFT JOIN active ON active.user_id = u.user_id`,
        [days]
      ),
      query(
        `SELECT COUNT(*) AS total_payments,
                COUNT(*) FILTER (WHERE payment_status = 'SUCCESS') AS successful_payments,
                COUNT(*) FILTER (WHERE payment_status = 'PENDING') AS pending_payments,
                COUNT(*) FILTER (WHERE payment_status = 'FAILED') AS failed_payments,
                COUNT(*) FILTER (WHERE payment_status IN ('REFUNDED', 'CANCELLED')) AS reversed_payments,
                COALESCE(SUM(amount) FILTER (WHERE payment_status = 'SUCCESS'), 0) AS revenue,
                COALESCE(AVG(amount) FILTER (WHERE payment_status = 'SUCCESS'), 0) AS average_order_value
         FROM payments
         WHERE created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')`,
        [days]
      ),
      query(
        `WITH days AS (
           SELECT generate_series(
             CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day'),
             CURRENT_DATE,
             INTERVAL '1 day'
           )::date AS date
         )
         SELECT days.date,
                COUNT(u.user_id) AS value
         FROM days
         LEFT JOIN users u ON DATE(u.created_at) = days.date AND u.deleted_at IS NULL
         GROUP BY days.date
         ORDER BY days.date`,
        [days]
      ),
      query(
        `WITH days AS (
           SELECT generate_series(
             CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day'),
             CURRENT_DATE,
             INTERVAL '1 day'
           )::date AS date
         ),
         activity AS (
           SELECT DISTINCT user_id, DATE(activity_at) AS date
           FROM (` + activeEventsCte + `) events
           WHERE activity_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
         )
         SELECT days.date,
                COUNT(DISTINCT activity.user_id) AS value
         FROM days
         LEFT JOIN activity ON activity.date = days.date
         GROUP BY days.date
         ORDER BY days.date`,
        [days]
      ),
      query(
        `WITH days AS (
           SELECT generate_series(
             CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day'),
             CURRENT_DATE,
             INTERVAL '1 day'
           )::date AS date
         )
         SELECT days.date,
                COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'SUCCESS'), 0) AS value
         FROM days
         LEFT JOIN payments p ON DATE(p.created_at) = days.date
         GROUP BY days.date
         ORDER BY days.date`,
        [days]
      ),
      query(
        `SELECT COALESCE(pl.plan_name, u.plan, 'UNKNOWN') AS plan_name,
                COALESCE(pl.display_name, u.plan, 'Unknown') AS display_name,
                COUNT(*) AS payments,
                COUNT(*) FILTER (WHERE p.payment_status = 'SUCCESS') AS successful_payments,
                COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'SUCCESS'), 0) AS revenue
         FROM payments p
         JOIN users u ON u.user_id = p.user_id
         LEFT JOIN subscriptions s ON s.subscription_id = p.subscription_id
         LEFT JOIN plans pl ON pl.plan_id = s.plan_id
         WHERE p.created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
         GROUP BY COALESCE(pl.plan_name, u.plan, 'UNKNOWN'), COALESCE(pl.display_name, u.plan, 'Unknown')
         ORDER BY revenue DESC`,
        [days]
      ),
      query(
        `SELECT payment_method AS method,
                COUNT(*) AS payments,
                COUNT(*) FILTER (WHERE payment_status = 'SUCCESS') AS successful_payments,
                COALESCE(SUM(amount) FILTER (WHERE payment_status = 'SUCCESS'), 0) AS revenue
         FROM payments
         WHERE created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
         GROUP BY payment_method
         ORDER BY revenue DESC, payments DESC`,
        [days]
      ),
      query(
        `WITH base AS (
           SELECT user_id FROM users WHERE deleted_at IS NULL
         ),
         wardrobe AS (
           SELECT DISTINCT user_id FROM wardrobe_items WHERE deleted_at IS NULL
         ),
         confirmed AS (
           SELECT DISTINCT user_id FROM daily_outfits
         ),
         try_on AS (
           SELECT DISTINCT user_id FROM node_try_on_sessions WHERE deleted_at IS NULL
         ),
         paid AS (
           SELECT DISTINCT u.user_id
           FROM users u
           LEFT JOIN payments p ON p.user_id = u.user_id AND p.payment_status = 'SUCCESS'
           WHERE u.deleted_at IS NULL AND (u.plan <> 'FREE' OR p.payment_id IS NOT NULL)
         )
         SELECT (SELECT COUNT(*) FROM base) AS registered_users,
                (SELECT COUNT(*) FROM wardrobe) AS wardrobe_users,
                (SELECT COUNT(*) FROM confirmed) AS confirmed_outfit_users,
                (SELECT COUNT(*) FROM try_on) AS try_on_users,
                (SELECT COUNT(*) FROM paid) AS paid_users`,
        []
      ),
      query(
        `WITH cohorts AS (
           SELECT user_id, DATE(created_at) AS cohort_date
           FROM users
           WHERE deleted_at IS NULL
             AND created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
         ),
         activity AS (
           SELECT user_id, DATE(activity_at) AS activity_date
           FROM (` + activeEventsCte + `) events
         )
         SELECT cohorts.cohort_date AS date,
                COUNT(DISTINCT cohorts.user_id) AS new_users,
                COUNT(DISTINCT cohorts.user_id) FILTER (
                  WHERE activity.activity_date BETWEEN cohorts.cohort_date + 1 AND cohorts.cohort_date + 7
                ) AS active_after_7d
         FROM cohorts
         LEFT JOIN activity ON activity.user_id = cohorts.user_id
         GROUP BY cohorts.cohort_date
         ORDER BY cohorts.cohort_date`,
        [days]
      ),
      query(
        `WITH user_item_counts AS (
           SELECT u.user_id, COUNT(wi.item_id) AS item_count
           FROM users u
           LEFT JOIN wardrobe_items wi ON wi.user_id = u.user_id AND wi.deleted_at IS NULL
           WHERE u.deleted_at IS NULL
           GROUP BY u.user_id
         ),
         item_stats AS (
           SELECT COUNT(*) AS total_items,
                  COUNT(*) FILTER (WHERE is_favorite = TRUE) AS favorite_items,
                  COUNT(*) FILTER (WHERE wear_count = 0) AS never_worn_items,
                  COALESCE(AVG(wear_count), 0) AS average_wear_count
           FROM wardrobe_items
           WHERE deleted_at IS NULL
         )
         SELECT item_stats.total_items,
                item_stats.favorite_items,
                item_stats.never_worn_items,
                item_stats.average_wear_count,
                COALESCE(AVG(user_item_counts.item_count), 0) AS average_items_per_user,
                COUNT(*) FILTER (WHERE user_item_counts.item_count = 0) AS empty_wardrobe_users
         FROM user_item_counts
         CROSS JOIN item_stats
         GROUP BY item_stats.total_items, item_stats.favorite_items, item_stats.never_worn_items, item_stats.average_wear_count`,
        []
      ),
      query(
        `SELECT category,
                COUNT(*) AS total_items,
                COALESCE(AVG(wear_count), 0) AS average_wear_count
         FROM wardrobe_items
         WHERE deleted_at IS NULL
         GROUP BY category
         ORDER BY total_items DESC, category ASC`,
        []
      ),
      query(
        `SELECT COUNT(*) AS trial_jobs,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_trials,
                COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_trials,
                COUNT(*) FILTER (WHERE status = 'PROCESSING') AS processing_trials,
                COUNT(*) FILTER (WHERE is_saved = TRUE) AS saved_trials,
                COALESCE(AVG(processing_time_seconds) FILTER (WHERE status = 'COMPLETED'), 0) AS average_processing_seconds
         FROM node_try_on_sessions
         WHERE deleted_at IS NULL
           AND created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')`,
        [days]
      ),
      query(
        `SELECT COUNT(*) AS total_suggestions,
                COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed_suggestions,
                COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_suggestions,
                COUNT(*) FILTER (WHERE status = 'GENERATED') AS generated_suggestions
         FROM ai_style_suggestions
         WHERE created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')`,
        [days]
      ),
      query(
        `SELECT u.user_id, u.full_name, u.email,
                COUNT(*) AS trial_jobs,
                COUNT(*) FILTER (WHERE nts.status = 'COMPLETED') AS completed_trials,
                COUNT(*) FILTER (WHERE nts.status = 'FAILED') AS failed_trials
         FROM node_try_on_sessions nts
         JOIN users u ON u.user_id = nts.user_id
         WHERE nts.deleted_at IS NULL
           AND nts.created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
         GROUP BY u.user_id, u.full_name, u.email
         ORDER BY trial_jobs DESC, failed_trials DESC
         LIMIT 6`,
        [days]
      ),
      query(
        `SELECT COUNT(*) AS total_subscriptions,
                COUNT(*) FILTER (WHERE status = 'ACTIVE' AND end_date > NOW()) AS active_subscriptions,
                COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_subscriptions,
                COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_subscriptions,
                COUNT(*) FILTER (WHERE status = 'EXPIRED' OR end_date <= NOW()) AS expired_subscriptions,
                COUNT(*) FILTER (
                  WHERE status = 'ACTIVE'
                    AND end_date > NOW()
                    AND end_date <= NOW() + INTERVAL '7 days'
                ) AS expiring_7d,
                COUNT(*) FILTER (WHERE auto_renew = TRUE) AS auto_renew_subscriptions
         FROM subscriptions`,
        []
      ),
      query(
        `SELECT plan, COUNT(*) AS users
         FROM users
         WHERE deleted_at IS NULL
         GROUP BY plan
         ORDER BY users DESC`,
        []
      ),
      query(
        `SELECT COUNT(*) FILTER (WHERE disconnected_at IS NULL) AS connected_calendars,
                COUNT(*) FILTER (WHERE disconnected_at IS NOT NULL) AS disconnected_calendars,
                COUNT(DISTINCT user_id) FILTER (WHERE disconnected_at IS NULL) AS users_with_calendar
         FROM calendar_connections`,
        []
      ),
      query(
        `SELECT COUNT(*) AS weather_snapshots,
                COUNT(DISTINCT user_id) AS users_with_weather,
                COALESCE(AVG(temperature_celsius), 0) AS average_temperature,
                COALESCE(AVG(relative_humidity), 0) AS average_humidity
         FROM weather_snapshots
         WHERE created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')`,
        [days]
      ),
    ]);

    var growth = results[0].rows[0];
    var revenue = results[1].rows[0];
    var funnel = results[7].rows[0];
    var product = results[9].rows[0];
    var productTotal = asNumber(product.total_items);
    var ai = results[11].rows[0];
    var suggestions = results[12].rows[0];
    var subscriptions = results[14].rows[0];
    var calendar = results[16].rows[0];
    var weather = results[17].rows[0];
    var totalUsers = asNumber(growth.total_users);
    var paidUsers = asNumber(growth.paid_users);
    var revenueTotal = asNumber(revenue.revenue);
    var trialJobs = asNumber(ai.trial_jobs);
    var completedTrials = asNumber(ai.completed_trials);
    var savedTrials = asNumber(ai.saved_trials);
    var totalSuggestions = asNumber(suggestions.total_suggestions);
    var estimatedTryOnCostUsd = completedTrials * tryOnCostUsd;
    var estimatedSuggestionCostUsd = totalSuggestions * suggestionCostUsd;

    var funnelRows = [
      { key: 'registered', label: 'Đăng ký', value: asNumber(funnel.registered_users) },
      { key: 'wardrobe', label: 'Có món đồ', value: asNumber(funnel.wardrobe_users) },
      { key: 'confirmedOutfit', label: 'Xác nhận outfit', value: asNumber(funnel.confirmed_outfit_users) },
      { key: 'tryOn', label: 'Dùng thử đồ AI', value: asNumber(funnel.try_on_users) },
      { key: 'paid', label: 'Trả phí', value: asNumber(funnel.paid_users) },
    ].map(function(stage, index, stages) {
      var previous = index === 0 ? stage.value : stages[index - 1].value;
      var registered = stages[0].value;
      return {
        key: stage.key,
        label: stage.label,
        value: stage.value,
        conversionFromPrevious: index === 0 ? 100 : safeRate(stage.value, previous),
        conversionFromRegistered: safeRate(stage.value, registered),
      };
    });

    res.json({
      period: {
        days: days,
      },
      growth: {
        totalUsers: totalUsers,
        newUsers: asNumber(growth.new_users),
        activeUsers: asNumber(growth.active_users),
        paidUsers: paidUsers,
        paidConversionRate: safeRate(paidUsers, totalUsers),
        activeRate: safeRate(growth.active_users, totalUsers),
        newUsersByDay: results[2].rows.map(chartPoint),
        activeUsersByDay: results[3].rows.map(chartPoint),
      },
      revenue: {
        total: revenueTotal,
        totalPayments: asNumber(revenue.total_payments),
        successfulPayments: asNumber(revenue.successful_payments),
        pendingPayments: asNumber(revenue.pending_payments),
        failedPayments: asNumber(revenue.failed_payments),
        reversedPayments: asNumber(revenue.reversed_payments),
        averageOrderValue: asNumber(revenue.average_order_value),
        paymentSuccessRate: safeRate(revenue.successful_payments, revenue.total_payments),
        arpu: totalUsers ? Math.round(revenueTotal / totalUsers) : 0,
        arppu: paidUsers ? Math.round(revenueTotal / paidUsers) : 0,
        revenueByDay: results[4].rows.map(chartPoint),
        revenueByPlan: results[5].rows.map(function(row) {
          return {
            planName: row.plan_name,
            displayName: row.display_name,
            payments: asNumber(row.payments),
            successfulPayments: asNumber(row.successful_payments),
            revenue: asNumber(row.revenue),
          };
        }),
        revenueByMethod: results[6].rows.map(function(row) {
          return {
            method: row.method,
            payments: asNumber(row.payments),
            successfulPayments: asNumber(row.successful_payments),
            successRate: safeRate(row.successful_payments, row.payments),
            revenue: asNumber(row.revenue),
          };
        }),
      },
      funnel: funnelRows,
      retention: {
        cohorts: results[8].rows.map(function(row) {
          return {
            date: row.date,
            newUsers: asNumber(row.new_users),
            activeAfter7d: asNumber(row.active_after_7d),
            retention7d: safeRate(row.active_after_7d, row.new_users),
          };
        }),
      },
      product: {
        totalItems: productTotal,
        averageItemsPerUser: Math.round(asNumber(product.average_items_per_user) * 10) / 10,
        emptyWardrobeUsers: asNumber(product.empty_wardrobe_users),
        favoriteItems: asNumber(product.favorite_items),
        favoriteItemRate: safeRate(product.favorite_items, productTotal),
        neverWornItems: asNumber(product.never_worn_items),
        neverWornItemRate: safeRate(product.never_worn_items, productTotal),
        averageWearCount: Math.round(asNumber(product.average_wear_count) * 10) / 10,
        categoryMix: results[10].rows.map(function(row) {
          return {
            category: row.category,
            totalItems: asNumber(row.total_items),
            share: safeRate(row.total_items, productTotal),
            averageWearCount: Math.round(asNumber(row.average_wear_count) * 10) / 10,
          };
        }),
      },
      ai: {
        trialJobs: trialJobs,
        completedTrials: completedTrials,
        failedTrials: asNumber(ai.failed_trials),
        processingTrials: asNumber(ai.processing_trials),
        savedTrials: savedTrials,
        successRate: safeRate(completedTrials, trialJobs),
        saveRate: safeRate(savedTrials, completedTrials),
        averageProcessingSeconds: Math.round(asNumber(ai.average_processing_seconds) * 10) / 10,
        totalSuggestions: totalSuggestions,
        confirmedSuggestions: asNumber(suggestions.confirmed_suggestions),
        generatedSuggestions: asNumber(suggestions.generated_suggestions),
        failedSuggestions: asNumber(suggestions.failed_suggestions),
        suggestionConfirmationRate: safeRate(suggestions.confirmed_suggestions, totalSuggestions),
        suggestionFailureRate: safeRate(suggestions.failed_suggestions, totalSuggestions),
        estimatedTryOnCostUsd: Math.round(estimatedTryOnCostUsd * 100) / 100,
        estimatedSuggestionCostUsd: Math.round(estimatedSuggestionCostUsd * 100) / 100,
        heavyUsers: results[13].rows.map(function(row) {
          return {
            userId: Number(row.user_id),
            fullName: row.full_name,
            email: row.email,
            trialJobs: asNumber(row.trial_jobs),
            completedTrials: asNumber(row.completed_trials),
            failedTrials: asNumber(row.failed_trials),
          };
        }),
      },
      subscriptions: {
        total: asNumber(subscriptions.total_subscriptions),
        active: asNumber(subscriptions.active_subscriptions),
        pending: asNumber(subscriptions.pending_subscriptions),
        cancelled: asNumber(subscriptions.cancelled_subscriptions),
        expired: asNumber(subscriptions.expired_subscriptions),
        expiring7d: asNumber(subscriptions.expiring_7d),
        autoRenew: asNumber(subscriptions.auto_renew_subscriptions),
        churnProxyRate: safeRate(
          asNumber(subscriptions.cancelled_subscriptions) + asNumber(subscriptions.expired_subscriptions),
          asNumber(subscriptions.active_subscriptions) + asNumber(subscriptions.cancelled_subscriptions) + asNumber(subscriptions.expired_subscriptions)
        ),
        usersByPlan: results[15].rows.map(function(row) {
          return {
            plan: row.plan,
            users: asNumber(row.users),
            share: safeRate(row.users, totalUsers),
          };
        }),
      },
      integrations: {
        connectedCalendars: asNumber(calendar.connected_calendars),
        disconnectedCalendars: asNumber(calendar.disconnected_calendars),
        usersWithCalendar: asNumber(calendar.users_with_calendar),
        calendarAdoptionRate: safeRate(calendar.users_with_calendar, totalUsers),
        weatherSnapshots: asNumber(weather.weather_snapshots),
        usersWithWeather: asNumber(weather.users_with_weather),
        weatherAdoptionRate: safeRate(weather.users_with_weather, totalUsers),
        averageTemperature: Math.round(asNumber(weather.average_temperature) * 10) / 10,
        averageHumidity: Math.round(asNumber(weather.average_humidity) * 10) / 10,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async function(req, res, next) {
  try {
    var pageParams = normalizePageParams(req.query);
    var params = [];
    var where = buildUserFilters(req.query || {}, params);
    var countResult = await query('SELECT COUNT(*) AS total FROM users u WHERE ' + where, params);
    var listParams = params.slice();
    listParams.push(pageParams.size, pageParams.offset);
    var listResult = await query(
      `SELECT u.user_id, u.public_id, u.full_name, u.email, u.phone, u.status, u.plan, u.plan_expires_at,
              u.storage_used, u.storage_limit, u.try_on_count_today, u.try_on_limit, u.created_at, u.updated_at,
              ac.last_login_at,
              COALESCE(array_agg(DISTINCT r.role_name) FILTER (WHERE r.role_name IS NOT NULL), ARRAY[]::varchar[]) AS roles,
              COALESCE(wc.wardrobe_count, 0) AS wardrobe_count,
              COALESCE(dc.daily_outfit_count, 0) AS daily_outfit_count,
              COALESCE(pc.payment_count, 0) AS payment_count,
              COALESCE(pc.total_paid, 0) AS total_paid
       FROM users u
       LEFT JOIN auth_credentials ac ON ac.user_id = u.user_id
       LEFT JOIN user_roles ur ON ur.user_id = u.user_id
       LEFT JOIN roles r ON r.role_id = ur.role_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS wardrobe_count
         FROM wardrobe_items wi
         WHERE wi.user_id = u.user_id
           AND wi.deleted_at IS NULL
       ) wc ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS daily_outfit_count
         FROM daily_outfits dof
         WHERE dof.user_id = u.user_id
       ) dc ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS payment_count,
                COALESCE(SUM(amount) FILTER (WHERE payment_status = 'SUCCESS'), 0) AS total_paid
         FROM payments pay
         WHERE pay.user_id = u.user_id
       ) pc ON TRUE
       WHERE ` + where + `
       GROUP BY u.user_id, ac.last_login_at, wc.wardrobe_count, dc.daily_outfit_count, pc.payment_count, pc.total_paid
       ORDER BY u.created_at DESC
       LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2),
      listParams
    );

    res.json(pageResponse(listResult.rows.map(userSummary), countResult.rows[0].total, pageParams));
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id', async function(req, res, next) {
  try {
    var userId = parsePositiveId(req.params.id, 'userId');
    var userResult = await query(
      `SELECT u.user_id, u.public_id, u.full_name, u.email, u.phone, u.status, u.plan, u.plan_expires_at,
              u.storage_used, u.storage_limit, u.try_on_count_today, u.try_on_limit, u.created_at, u.updated_at,
              ac.last_login_at,
              COALESCE(array_agg(DISTINCT r.role_name) FILTER (WHERE r.role_name IS NOT NULL), ARRAY[]::varchar[]) AS roles,
              0 AS wardrobe_count, 0 AS daily_outfit_count, 0 AS payment_count, 0 AS total_paid
       FROM users u
       LEFT JOIN auth_credentials ac ON ac.user_id = u.user_id
       LEFT JOIN user_roles ur ON ur.user_id = u.user_id
       LEFT JOIN roles r ON r.role_id = ur.role_id
       WHERE u.user_id = $1
         AND u.deleted_at IS NULL
       GROUP BY u.user_id, ac.last_login_at`,
      [userId]
    );
    if (userResult.rowCount === 0) {
      throw publicError('Không tìm thấy người dùng.', 404, 'USER_NOT_FOUND');
    }

    var related = await Promise.all([
      query(
        `SELECT COUNT(*) AS wardrobe_count,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS wardrobe_30d
         FROM wardrobe_items
         WHERE user_id = $1
           AND deleted_at IS NULL`,
        [userId]
      ),
      query(
        `SELECT COUNT(*) AS daily_outfits,
                MAX(worn_date) AS last_worn_date
         FROM daily_outfits
         WHERE user_id = $1`,
        [userId]
      ),
      query(
        `SELECT payment_id, user_id, subscription_id, amount, currency, payment_method, payment_status, transaction_code,
                plan_type, paid_at, created_at,
                NULL::varchar AS full_name, NULL::varchar AS email
         FROM payments
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId]
      ),
      query(
        `SELECT wi.item_id, wi.user_id, u.full_name, u.email, wi.item_name, wi.brand, wi.category, wi.color, wi.color_hex,
                wi.season, wi.pattern, wi.material, wi.size, wi.thumbnail_url, wi.background_removed_url,
                wi.is_favorite, COALESCE(wip.item_status, 'IN_USE') AS item_status, wi.wear_count, wi.last_worn_at, wi.created_at
         FROM wardrobe_items wi
         JOIN users u ON u.user_id = wi.user_id
         LEFT JOIN wardrobe_item_preferences wip ON wip.user_id = wi.user_id AND wip.item_id = wi.item_id
         WHERE wi.user_id = $1
           AND wi.deleted_at IS NULL
         ORDER BY wi.created_at DESC
         LIMIT 6`,
        [userId]
      ),
    ]);

    var user = userSummary({
      ...userResult.rows[0],
      wardrobe_count: related[0].rows[0].wardrobe_count,
      daily_outfit_count: related[1].rows[0].daily_outfits,
      payment_count: related[2].rowCount,
      total_paid: related[2].rows.reduce(function(total, row) {
        return total + (row.payment_status === 'SUCCESS' ? asNumber(row.amount) : 0);
      }, 0),
    });

    res.json({
      user: user,
      stats: {
        wardrobe30d: asNumber(related[0].rows[0].wardrobe_30d),
        dailyOutfits: asNumber(related[1].rows[0].daily_outfits),
        lastWornDate: related[1].rows[0].last_worn_date,
      },
      recentPayments: related[2].rows.map(paymentResponse),
      recentItems: related[3].rows.map(wardrobeItemResponse),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/status', async function(req, res, next) {
  try {
    var userId = parsePositiveId(req.params.id, 'userId');
    var nextStatus = normalizeEnum(req.body && req.body.status, USER_STATUSES, 'status', false);
    if (userId === Number(req.user.userId) && nextStatus !== 'ACTIVE') {
      throw publicError('Không thể tự khóa hoặc cấm tài khoản admin đang đăng nhập.', 409, 'SELF_STATUS_UPDATE_DENIED');
    }

    var updated = await withTransaction(async function(client) {
      var before = await client.query(
        `SELECT user_id, full_name, email, status
         FROM users
         WHERE user_id = $1
           AND deleted_at IS NULL
         FOR UPDATE`,
        [userId]
      );
      if (before.rowCount === 0) {
        throw publicError('Không tìm thấy người dùng.', 404, 'USER_NOT_FOUND');
      }

      var after = await client.query(
        `UPDATE users
         SET status = $2,
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING user_id, public_id, full_name, email, phone, status, plan, plan_expires_at,
                   storage_used, storage_limit, try_on_count_today, try_on_limit, created_at, updated_at`,
        [userId, nextStatus]
      );

      await writeAudit(client, req, 'ADMIN_USER_STATUS_UPDATE', 'users', userId, before.rows[0], { status: nextStatus });
      return userSummary({ ...after.rows[0], roles: [], wardrobe_count: 0, daily_outfit_count: 0, payment_count: 0, total_paid: 0 });
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/plan', async function(req, res, next) {
  try {
    var userId = parsePositiveId(req.params.id, 'userId');
    var plan = normalizeEnum(req.body && req.body.plan, USER_PLANS, 'plan', false);
    var defaults = planDefaults(plan, req.body || {});

    var updated = await withTransaction(async function(client) {
      var before = await client.query(
        `SELECT user_id, full_name, email, plan, plan_expires_at, storage_limit, try_on_limit
         FROM users
         WHERE user_id = $1
           AND deleted_at IS NULL
         FOR UPDATE`,
        [userId]
      );
      if (before.rowCount === 0) {
        throw publicError('Không tìm thấy người dùng.', 404, 'USER_NOT_FOUND');
      }

      var after = await client.query(
        `UPDATE users
         SET plan = $2,
             plan_expires_at = $3,
             storage_limit = $4,
             try_on_limit = $5,
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING user_id, public_id, full_name, email, phone, status, plan, plan_expires_at,
                   storage_used, storage_limit, try_on_count_today, try_on_limit, created_at, updated_at`,
        [userId, plan, defaults.planExpiresAt, defaults.storageLimit, defaults.tryOnLimit]
      );

      await writeAudit(client, req, 'ADMIN_USER_PLAN_UPDATE', 'users', userId, before.rows[0], {
        plan: plan,
        planExpiresAt: defaults.planExpiresAt,
        storageLimit: defaults.storageLimit,
        tryOnLimit: defaults.tryOnLimit,
      });
      return userSummary({ ...after.rows[0], roles: [], wardrobe_count: 0, daily_outfit_count: 0, payment_count: 0, total_paid: 0 });
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/wardrobe-items', async function(req, res, next) {
  try {
    var pageParams = normalizePageParams(req.query);
    var params = [];
    var where = ['wi.deleted_at IS NULL'];
    var q = normalizeQueryText(req.query.q, 120);
    var category = req.query.category ? normalizeEnum(req.query.category, WARDROBE_CATEGORIES, 'category', false) : '';

    if (q) {
      params.push('%' + q.toLowerCase() + '%');
      where.push(
        `(LOWER(wi.item_name) LIKE $` + params.length + `
          OR LOWER(COALESCE(wi.brand, '')) LIKE $` + params.length + `
          OR LOWER(COALESCE(u.email, '')) LIKE $` + params.length + `
          OR LOWER(COALESCE(u.full_name, '')) LIKE $` + params.length + `)`
      );
    }
    if (category) {
      params.push(category);
      where.push('wi.category = $' + params.length);
    }

    var whereSql = where.join(' AND ');
    var countResult = await query(
      `SELECT COUNT(*) AS total
       FROM wardrobe_items wi
       JOIN users u ON u.user_id = wi.user_id
       WHERE ` + whereSql,
      params
    );
    var listParams = params.slice();
    listParams.push(pageParams.size, pageParams.offset);
    var listResult = await query(
      `SELECT wi.item_id, wi.user_id, u.full_name, u.email, wi.item_name, wi.brand, wi.category, wi.color, wi.color_hex,
              wi.season, wi.pattern, wi.material, wi.size, wi.thumbnail_url, wi.background_removed_url,
              wi.is_favorite, COALESCE(wip.item_status, 'IN_USE') AS item_status, wi.wear_count, wi.last_worn_at, wi.created_at
       FROM wardrobe_items wi
       JOIN users u ON u.user_id = wi.user_id
       LEFT JOIN wardrobe_item_preferences wip ON wip.user_id = wi.user_id AND wip.item_id = wi.item_id
       WHERE ` + whereSql + `
       ORDER BY wi.created_at DESC
       LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2),
      listParams
    );

    res.json(pageResponse(listResult.rows.map(wardrobeItemResponse), countResult.rows[0].total, pageParams));
  } catch (err) {
    next(err);
  }
});

router.delete('/wardrobe-items/:id', async function(req, res, next) {
  try {
    var itemId = parsePositiveId(req.params.id, 'itemId');
    var result = await withTransaction(async function(client) {
      var before = await client.query(
        `SELECT item_id, user_id, item_name, category, deleted_at
         FROM wardrobe_items
         WHERE item_id = $1
           AND deleted_at IS NULL
         FOR UPDATE`,
        [itemId]
      );
      if (before.rowCount === 0) {
        throw publicError('Không tìm thấy món đồ.', 404, 'WARDROBE_ITEM_NOT_FOUND');
      }

      await client.query(
        `UPDATE wardrobe_items
         SET deleted_at = NOW(),
             updated_at = NOW()
         WHERE item_id = $1`,
        [itemId]
      );
      await client.query(
        `UPDATE users
         SET storage_used = GREATEST(storage_used - 1, 0),
             updated_at = NOW()
         WHERE user_id = $1`,
        [before.rows[0].user_id]
      );
      await writeAudit(client, req, 'ADMIN_WARDROBE_ITEM_DELETE', 'wardrobe_items', itemId, before.rows[0], { deleted: true });
      return { deleted: true, itemId: itemId };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/payments', async function(req, res, next) {
  try {
    var pageParams = normalizePageParams(req.query);
    var params = [];
    var where = ['1 = 1'];
    var q = normalizeQueryText(req.query.q, 120);
    var status = req.query.status ? normalizeEnum(req.query.status, PAYMENT_STATUSES, 'paymentStatus', false) : '';

    if (q) {
      params.push('%' + q.toLowerCase() + '%');
      where.push(
        `(LOWER(u.email) LIKE $` + params.length + `
          OR LOWER(u.full_name) LIKE $` + params.length + `
          OR LOWER(COALESCE(p.transaction_code, '')) LIKE $` + params.length + `)`
      );
    }
    if (status) {
      params.push(status);
      where.push('p.payment_status = $' + params.length);
    }

    var whereSql = where.join(' AND ');
    var countResult = await query(
      `SELECT COUNT(*) AS total
       FROM payments p
       JOIN users u ON u.user_id = p.user_id
       WHERE ` + whereSql,
      params
    );
    var listParams = params.slice();
    listParams.push(pageParams.size, pageParams.offset);
    var listResult = await query(
      `SELECT p.payment_id, p.user_id, u.full_name, u.email, p.subscription_id, p.amount, p.currency,
              p.payment_method, p.payment_status, p.transaction_code, p.plan_type, p.paid_at, p.created_at
       FROM payments p
       JOIN users u ON u.user_id = p.user_id
       WHERE ` + whereSql + `
       ORDER BY p.created_at DESC
       LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2),
      listParams
    );

    res.json(pageResponse(listResult.rows.map(paymentResponse), countResult.rows[0].total, pageParams));
  } catch (err) {
    next(err);
  }
});

router.get('/subscriptions', async function(req, res, next) {
  try {
    var pageParams = normalizePageParams(req.query);
    var params = [];
    var where = ['1 = 1'];
    var q = normalizeQueryText(req.query.q, 120);
    var status = req.query.status ? normalizeEnum(req.query.status, SUBSCRIPTION_STATUSES, 'subscriptionStatus', false) : '';
    var plan = req.query.plan ? normalizeEnum(req.query.plan, USER_PLANS, 'plan', false) : '';

    if (q) {
      params.push('%' + q.toLowerCase() + '%');
      where.push('(LOWER(u.email) LIKE $' + params.length + ' OR LOWER(u.full_name) LIKE $' + params.length + ')');
    }
    if (status) {
      params.push(status);
      where.push('s.status = $' + params.length);
    }
    if (plan) {
      params.push(plan);
      where.push('pl.plan_name = $' + params.length);
    }

    var whereSql = where.join(' AND ');
    var countResult = await query(
      `SELECT COUNT(*) AS total
       FROM subscriptions s
       JOIN users u ON u.user_id = s.user_id
       JOIN plans pl ON pl.plan_id = s.plan_id
       WHERE ` + whereSql,
      params
    );
    var listParams = params.slice();
    listParams.push(pageParams.size, pageParams.offset);
    var listResult = await query(
      `SELECT s.subscription_id, s.user_id, u.full_name, u.email, s.plan_id, pl.plan_name, pl.display_name,
              pl.price, pl.currency, s.status, s.auto_renew, s.start_date, s.end_date, s.created_at, s.cancelled_at
       FROM subscriptions s
       JOIN users u ON u.user_id = s.user_id
       JOIN plans pl ON pl.plan_id = s.plan_id
       WHERE ` + whereSql + `
       ORDER BY s.created_at DESC
       LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2),
      listParams
    );

    res.json(pageResponse(listResult.rows.map(subscriptionResponse), countResult.rows[0].total, pageParams));
  } catch (err) {
    next(err);
  }
});

router.get('/audit-logs', async function(req, res, next) {
  try {
    var pageParams = normalizePageParams(req.query);
    var params = [];
    var where = ['1 = 1'];
    var q = normalizeQueryText(req.query.q, 120);
    if (q) {
      params.push('%' + q.toLowerCase() + '%');
      where.push(
        `(LOWER(a.action) LIKE $` + params.length + `
          OR LOWER(COALESCE(a.entity_name, '')) LIKE $` + params.length + `
          OR LOWER(COALESCE(u.email, '')) LIKE $` + params.length + `)`
      );
    }

    var whereSql = where.join(' AND ');
    var countResult = await query(
      `SELECT COUNT(*) AS total
       FROM audit_logs a
       LEFT JOIN users u ON u.user_id = a.actor_user_id
       WHERE ` + whereSql,
      params
    );
    var listParams = params.slice();
    listParams.push(pageParams.size, pageParams.offset);
    var listResult = await query(
      `SELECT a.audit_id, a.actor_user_id, u.full_name AS actor_name, u.email AS actor_email,
              a.action, a.entity_name, a.entity_id, a.ip_address, a.user_agent,
              a.old_value, a.new_value, a.created_at
       FROM audit_logs a
       LEFT JOIN users u ON u.user_id = a.actor_user_id
       WHERE ` + whereSql + `
       ORDER BY a.created_at DESC
       LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2),
      listParams
    );

    res.json(pageResponse(listResult.rows.map(auditResponse), countResult.rows[0].total, pageParams));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
