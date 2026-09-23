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
