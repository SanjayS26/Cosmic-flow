import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from '../config/database.js';

const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations',
);

export async function runMigrations(database = getPool()) {
  const lockName = 'ai_task_deconstructor_migrations';
  const lockClient = await database.connect();
  let lockAcquired = false;

  try {
    await lockClient.query('SELECT pg_advisory_lock(hashtext($1))', [lockName]);
    lockAcquired = true;
    await database.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const filenames = (await readdir(migrationsDirectory))
      .filter((filename) => /^\d{3}_[a-z0-9_]+\.sql$/.test(filename))
      .sort();

    for (const filename of filenames) {
      const alreadyApplied = await database.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename],
      );

      if (alreadyApplied.rowCount > 0) {
        console.log(`Skipped ${filename}`);
        continue;
      }

      const client = await database.connect();

      try {
        const sql = await readFile(path.join(migrationsDirectory, filename), 'utf8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename],
        );
        await client.query('COMMIT');
        console.log(`Applied ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Failed ${filename}`);
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    if (lockAcquired) {
      await lockClient.query('SELECT pg_advisory_unlock(hashtext($1))', [lockName]);
    }
    lockClient.release();
  }
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const database = getPool();

  try {
    await runMigrations(database);
  } finally {
    await database.end();
  }
}
