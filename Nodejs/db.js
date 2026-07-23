var { Pool } = require('pg');

function parseJdbcUrl(value) {
  if (!value || !value.startsWith('jdbc:postgresql://')) return null;

  var parsed = new URL(value.replace(/^jdbc:/, ''));
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    database: parsed.pathname.replace(/^\//, ''),
  };
}

function buildPoolConfig() {
  if (process.env.DATABASE_URL) {
    var useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    };
  }

  var jdbc = parseJdbcUrl(process.env.DB_URL);
  return {
    host: process.env.DB_HOST || (jdbc && jdbc.host) || 'localhost',
    port: Number(process.env.DB_PORT || (jdbc && jdbc.port) || 5432),
    database: process.env.DB_NAME || process.env.POSTGRES_DB || (jdbc && jdbc.database) || 'shelfy_db',
    user: process.env.DB_USERNAME || process.env.POSTGRES_USER || 'shelfy',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
  };
}

var pool = new Pool(buildPoolConfig());

function query(text, params) {
  return pool.query(text, params);
}

async function withTransaction(callback) {
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    var result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool: pool,
  query: query,
  withTransaction: withTransaction,
};
