// backend/src/db/mysql.ts
import { createPool, Pool, PoolConnection } from 'mysql2/promise';
import { config } from '../config/env';

// Reader pool (read-only credentials)
const readerPool: Pool = createPool({
  host: config.MYSQL_HOST,
  port: Number(config.MYSQL_PORT),
  user: config.MYSQL_READER_USER,
  password: config.MYSQL_READER_PASSWORD,
  database: config.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

// Writer pool (write credentials)
const writerPool: Pool = createPool({
  host: config.MYSQL_HOST,
  port: Number(config.MYSQL_PORT),
  user: config.MYSQL_WRITER_USER,
  password: config.MYSQL_WRITER_PASSWORD,
  database: config.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

export function getReaderConnection(): Pool {
  return readerPool;
}

export function getWriterConnection(): Pool {
  return writerPool;
}
