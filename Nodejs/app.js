var dotenvResult = require('dotenv').config();

if (dotenvResult.parsed) {
  Object.keys(dotenvResult.parsed).forEach(function(key) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = dotenvResult.parsed[key];
    }
  });
}

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var cors = require('cors');
var helmet = require('helmet');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var weatherRouter = require('./routes/weather');
var calendarRouter = require('./routes/calendar');
var dailyOutfitsRouter = require('./routes/dailyOutfits');
var suggestionsRouter = require('./routes/suggestions');
var wardrobePreferencesRouter = require('./routes/wardrobePreferences');
var trialRouter = require('./routes/trial');
var paymentsRouter = require('./routes/payments');
var adminRouter = require('./routes/admin');

var app = express();

function getAllowedOrigins() {
  return String(process.env.APP_CORS_ALLOWED_ORIGINS || process.env.APP_FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(function(origin) { return origin.trim(); })
    .filter(Boolean);
}

function getJsonBodyLimit() {
  return process.env.APP_JSON_BODY_LIMIT || '16mb';
}

app.use(logger('dev'));
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (getAllowedOrigins().includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: getJsonBodyLimit() }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/daily-outfits', dailyOutfitsRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/wardrobe', wardrobePreferencesRouter);
app.use('/api/trial', trialRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);

app.get('/health', function(req, res) {
  res.json({ status: 'ok', service: 'shelfy-node' });
});

app.use(function(req, res, next) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint không tồn tại.',
    },
  });
});

app.use(function(err, req, res, next) {
  if (res.headersSent) return next(err);

  var status = err.status || 500;
  var code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  res.status(status).json({
    error: {
      code: code,
      message: err.publicMessage || err.message || 'Có lỗi xảy ra.',
    },
  });
});

module.exports = app;
