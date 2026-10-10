// backend/src/db/postgres.ts
import { Pool } from 'pg';
import { config } from '../config/env';

// Reader pool (read-only credentials)
const readerPool = new Pool({
  host: config.POSTGRES_HOST,
  port: Number(config.POSTGRES_PORT),
  user: config.POSTGRES_READER_USER,
  password: config.POSTGRES_READER_PASSWORD,
  database: config.POSTGRES_DATABASE,
  max: 10,
});

// Writer pool (write credentials)
const writerPool = new Pool({
  host: config.POSTGRES_HOST,
  port: Number(config.POSTGRES_PORT),
  user: config.POSTGRES_WRITER_USER,
  password: config.POSTGRES_WRITER_PASSWORD,
  database: config.POSTGRES_DATABASE,
  max: 10,
});

export function getReaderConnection(): Pool {
  return readerPool;
}

export function getWriterConnection(): Pool {
  return writerPool;
}

// History pool (read-only credentials for app_history)
const historyReaderPool = new Pool({
  host: config.POSTGRES_HOST,
  port: Number(config.POSTGRES_PORT),
  user: config.POSTGRES_READER_USER,
  password: config.POSTGRES_READER_HISTORY_PASSWORD || config.POSTGRES_READER_PASSWORD,
  database: 'app_history',
  max: 10,
});
// History pool (write credentials for app_history)


const historyWriterPool = new Pool({
  host: config.POSTGRES_HOST,
  port: Number(config.POSTGRES_PORT),
  user: config.POSTGRES_WRITER_USER,
  password: config.POSTGRES_WRITER_HISTORY_PASSWORD || config.POSTGRES_WRITER_PASSWORD,
  database: 'app_history',
  max: 10,
});
export function getHistoryReaderConnection(): Pool {
  return historyReaderPool;
}

export function getHistoryWriterConnection(): Pool {
  return historyWriterPool;
}
