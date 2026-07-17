import dotenv from 'dotenv';
import pg from 'pg';
import AppError from '../utils/AppError.js';

dotenv.config({ quiet: true });

const { Pool } = pg;
const DEFAULT_CONNECTION_TIMEOUT_MS = 5000;
const DEFAULT_MAX_CONNECTIONS = 10;

let defaultPool;

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getSslConfiguration(environment) {
  if (environment.DATABASE_SSL !== 'true') {
    return undefined;
  }

  return {
    rejectUnauthorized:
      environment.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

export function createPool(environment = process.env) {
  if (!environment.DATABASE_URL) {
    throw new AppError(
      'DATABASE_CONFIGURATION_ERROR',
      'The database connection is not configured.',
      503,
    );
  }

  return new Pool({
    connectionString: environment.DATABASE_URL,
    connectionTimeoutMillis: parsePositiveInteger(
      environment.DATABASE_CONNECTION_TIMEOUT_MS,
      DEFAULT_CONNECTION_TIMEOUT_MS,
    ),
    max: parsePositiveInteger(
      environment.DATABASE_POOL_MAX,
      DEFAULT_MAX_CONNECTIONS,
    ),
    idleTimeoutMillis: 30_000,
    ssl: getSslConfiguration(environment),
  });
}

export function getPool() {
  if (!defaultPool) {
    defaultPool = createPool();
    defaultPool.on('error', () => {
      // Pool errors are intentionally not logged with connection details.
      console.error('An idle PostgreSQL connection failed.');
    });
  }

  return defaultPool;
}

export async function checkDatabaseHealth(database = getPool()) {
  await database.query('SELECT 1');
  return true;
}

export async function withTransaction(operation, database = getPool()) {
  const client = await database.connect();

  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (defaultPool) {
    await defaultPool.end();
    defaultPool = undefined;
  }
}
