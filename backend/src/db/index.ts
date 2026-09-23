// backend/src/db/index.ts
import { Pool as MySQLPool } from 'mysql2/promise';
import { Pool as PgPool } from 'pg';
import * as mysql from './mysql';
import * as pg from './postgres';

type DBDialect = 'mysql' | 'postgres';

type DBConnection = {
  query: (sql: string, params?: any[]) => Promise<any>;
  // expose underlying pool for advanced usage if needed
  getRawPool: () => MySQLPool | PgPool;
};

function wrapMySQL(pool: MySQLPool): DBConnection {
  return {
    query: (sql, params) => pool.execute(sql, params ?? []),
    getRawPool: () => pool,
  };
}

function wrapPg(pool: PgPool): DBConnection {
  return {
    query: (sql, params) => pool.query(sql, params ?? []),
    getRawPool: () => pool,
  };
}

export function getReaderConnection(dialect: DBDialect): DBConnection {
  if (dialect === 'mysql') {
    return wrapMySQL(mysql.getReaderConnection());
  }
  if (dialect === 'postgres') {
    return wrapPg(pg.getReaderConnection());
  }
  throw new Error(`Unsupported dialect: ${dialect}`);
}

export function getWriterConnection(dialect: DBDialect): DBConnection {
  if (dialect === 'mysql') {
    return wrapMySQL(mysql.getWriterConnection());
  }
  if (dialect === 'postgres') {
    return wrapPg(pg.getWriterConnection());
  }
  throw new Error(`Unsupported dialect: ${dialect}`);
}
