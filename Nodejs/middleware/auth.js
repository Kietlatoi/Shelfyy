var jwt = require('jsonwebtoken');
var { query } = require('../db');

function looksLikeBase64(value) {
  var raw = String(value || '').trim();
  if (!raw || raw.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return false;

  try {
    var normalized = raw.replace(/=+$/, '');
    var encoded = Buffer.from(raw, 'base64').toString('base64').replace(/=+$/, '');
    return encoded === normalized;
  } catch (err) {
    return false;
  }
}

function getJwtKey() {
  var secret = process.env.JWT_SECRET;
  if (!secret) {
    var error = new Error('JWT secret chưa được cấu hình cho Nodejs service.');
    error.status = 500;
    error.code = 'JWT_SECRET_MISSING';
    throw error;
  }
  return looksLikeBase64(secret) ? Buffer.from(secret, 'base64') : Buffer.from(secret, 'utf8');
}

function unauthorized(message) {
  var error = new Error(message || 'Bạn cần đăng nhập để dùng tính năng này.');
  error.status = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

async function authenticate(req, res, next) {
  try {
    var header = req.get('authorization') || '';
    var match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return next(unauthorized());

    var payload = jwt.verify(match[1], getJwtKey(), {
      algorithms: ['HS256', 'HS384', 'HS512'],
    });

    if (!payload || !payload.userId) {
      return next(unauthorized('Access token không hợp lệ.'));
    }

    var result = await query(
      'SELECT user_id, public_id, email, full_name, status FROM users WHERE user_id = $1 AND deleted_at IS NULL',
      [payload.userId]
    );

    if (result.rowCount === 0) return next(unauthorized('Tài khoản không tồn tại.'));
    var user = result.rows[0];
    if (user.status !== 'ACTIVE') {
      var forbidden = new Error('Tài khoản không có quyền dùng tính năng này.');
      forbidden.status = 403;
      forbidden.code = 'FORBIDDEN';
      return next(forbidden);
    }

    req.user = {
      userId: user.user_id,
      publicId: user.public_id,
      email: user.email,
      fullName: user.full_name,
    };
    return next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(unauthorized('Access token không hợp lệ hoặc đã hết hạn.'));
    }
    return next(err);
  }
}

async function getRoleContext(userId) {
  var result = await query(
    `SELECT COALESCE(json_agg(DISTINCT r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '[]'::json) AS roles,
            COALESCE(json_agg(DISTINCT p.permission_code) FILTER (WHERE p.permission_code IS NOT NULL), '[]'::json) AS permissions
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.user_id
     LEFT JOIN roles r ON r.role_id = ur.role_id
     LEFT JOIN role_permissions rp ON rp.role_id = r.role_id
     LEFT JOIN permissions p ON p.permission_id = rp.permission_id
     WHERE u.user_id = $1
       AND u.deleted_at IS NULL`,
    [userId]
  );

  var row = result.rows[0] || {};
  return {
    roles: Array.isArray(row.roles) ? row.roles : [],
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
  };
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.userId) {
      return next(unauthorized());
    }

    var context = await getRoleContext(req.user.userId);
    if (!context.roles.includes('ADMIN')) {
      var forbidden = new Error('Bạn không có quyền truy cập trang quản trị.');
      forbidden.status = 403;
      forbidden.code = 'ADMIN_FORBIDDEN';
      return next(forbidden);
    }

    req.user.roles = context.roles;
    req.user.permissions = context.permissions;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authenticate: authenticate,
  requireAdmin: requireAdmin,
};
