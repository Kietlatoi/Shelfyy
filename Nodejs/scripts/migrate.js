require('dotenv').config();

var fs = require('fs');
var path = require('path');
var { pool, withTransaction } = require('../db');

var migrationsDir = path.join(__dirname, '..', 'migrations');

async function ensureMigrationTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS node_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`
  );
}

async function appliedMigrations() {
  var result = await pool.query('SELECT filename FROM node_migrations');
  return new Set(result.rows.map(function(row) { return row.filename; }));
}

async function runMigration(filename) {
  var sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
  await withTransaction(async function(client) {
    await client.query(sql);
    await client.query(
      'INSERT INTO node_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
      [filename]
    );
  });
  console.log('applied migration: ' + filename);
}

async function main() {
  await ensureMigrationTable();

  var files = fs.readdirSync(migrationsDir)
    .filter(function(file) { return file.endsWith('.sql'); })
    .sort();
  var applied = await appliedMigrations();

  for (var i = 0; i < files.length; i += 1) {
    if (!applied.has(files[i])) {
      await runMigration(files[i]);
    }
  }

  console.log('node migrations complete');
}

main()
  .catch(function(err) {
    console.error(err.message || err);
    process.exitCode = 1;
  })
  .finally(function() {
    return pool.end();
  });
