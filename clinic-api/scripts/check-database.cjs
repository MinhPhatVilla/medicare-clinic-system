const { Client } = require('pg');

async function checkDatabase() {
  const { AppDataSource } = require('../dist/config/database');
  const options = AppDataSource.options;
  // Use a raw connection so this check never runs schema synchronization or migrations.
  const client = new Client({
    host: options.host,
    port: options.port,
    user: options.username,
    password: options.password,
    database: options.database,
    ssl: options.ssl,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1 AS connected');
    process.stdout.write(`Database connection OK; TLS: ${options.ssl ? 'enabled (certificate verified)' : 'disabled (local development only)'}.\n`);
  } finally {
    await client.end();
  }
}

checkDatabase().catch(error => {
  const codes = {
    ENOTFOUND: 'Database hostname could not be resolved. Check DB_HOST.',
    ECONNREFUSED: 'Connection refused. Check database status, hostname and port.',
    ENETUNREACH: 'Network unreachable. Try the IPv4 Session pooler.',
    '28P01': 'Authentication failed. Check DB_USERNAME and DB_PASSWORD.',
    '3D000': 'Database does not exist. Check DB_NAME.',
    ENOENT: 'Certificate or build file missing. Check DB_SSL_CA_FILE and run npm run build.',
    SELF_SIGNED_CERT_IN_CHAIN: 'Download the database CA certificate and set DB_SSL_CA_FILE.',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'Check the database CA certificate in DB_SSL_CA_FILE.',
    ERR_TLS_CERT_ALTNAME_INVALID: 'Certificate hostname mismatch. Check DB_HOST and the certificate.',
  };
  // Avoid printing driver errors that may include database credentials.
  process.stderr.write((codes[error.code] || 'Connection check failed. Check network, database status and SSL settings.') + '\n');
  process.exitCode = 1;
});
