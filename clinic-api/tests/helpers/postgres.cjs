const { mkdtempSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, dirname } = require('node:path');
const net = require('node:net');
Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'test-only',
  DB_NAME: 'invoice_test',
  DB_SYNCHRONIZE: 'false',
  DB_LOGGING: 'false',
  JWT_SECRET: 'invoice-test-secret-only',
  JWT_REFRESH_SECRET: 'invoice-test-refresh-only',
});

require('reflect-metadata');
require('express-async-errors');
const { AppDataSource: db } = require('../../dist/config/database');

async function startDatabase({ synchronize = true } = {}) {
  let postgres, clusterDir;
  const port = await new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
  clusterDir = mkdtempSync(join(tmpdir(), 'invoices-test-'));
  if (process.platform === 'win32') {
    // PostgreSQL's Windows launcher cannot re-exec from Unicode workspace paths.
    const binaries = await import('@embedded-postgres/windows-x64');
    const nativeDir = join(clusterDir, 'native');
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        'Copy-Item -LiteralPath $env:INVOICE_TEST_NATIVE_SOURCE -Destination $env:INVOICE_TEST_NATIVE_DEST -Recurse',
      ],
      {
        windowsHide: true,
        timeout: 60000,
        env: {
          ...process.env,
          INVOICE_TEST_NATIVE_SOURCE: dirname(dirname(binaries.postgres)),
          INVOICE_TEST_NATIVE_DEST: nativeDir,
        },
      },
    );
    const pgCtl = join(nativeDir, 'bin', 'pg_ctl.exe');
    const dataDir = join(clusterDir, 'db');
    const run = (binary, args) =>
      execFileSync(binary, args, { windowsHide: true, timeout: 60000, stdio: 'ignore' });
    run(join(nativeDir, 'bin', 'initdb.exe'), [
      '-D',
      dataDir,
      '-U',
      'postgres',
      '--auth=trust',
      '--encoding=UTF8',
      '--locale=C',
    ]);
    postgres = { stop: async () => run(pgCtl, ['-D', dataDir, '-m', 'fast', '-w', 'stop']) };
    run(pgCtl, [
      '-D',
      dataDir,
      '-l',
      join(clusterDir, 'postgres.log'),
      '-o',
      `-h 127.0.0.1 -p ${port}`,
      '-w',
      'start',
    ]);
    const { Client } = require('pg');
    const client = new Client({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres' });
    await client.connect();
    try {
      await client.query('CREATE DATABASE invoice_test');
    } finally {
      await client.end();
    }
  } else {
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    postgres = new EmbeddedPostgres({
      databaseDir: join(clusterDir, 'db'),
      user: 'postgres',
      password: 'test-only',
      port,
      persistent: true,
      initdbFlags: ['--encoding=UTF8', '--locale=C'],
      postgresFlags: ['-h', '127.0.0.1'],
      onLog: () => {},
      onError: () => {},
    });
    await postgres.initialise();
    await postgres.start();
    await postgres.createDatabase('invoice_test');
  }
  db.setOptions({
    host: '127.0.0.1',
    port,
    username: 'postgres',
    password: 'test-only',
    database: 'invoice_test',
    synchronize,
    logging: false,
    ssl: false,
  });
  await db.initialize();

  return { db, port, async stop() {
    if (db.isInitialized) await db.destroy();
    if (postgres) await postgres.stop();
    if (clusterDir && clusterDir.startsWith(join(tmpdir(), 'invoices-test-'))) {
      rmSync(clusterDir, { recursive: true, force: true });
    }
  } };
}
module.exports = { startDatabase, db };

