// backend/src/services/schema/introspectionService.ts
import { getReaderConnection } from '../../db';

type DBDialect = 'mysql' | 'postgres';

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface ForeignKeyInfo {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
}

export interface SchemaInfo {
  tables: TableInfo[];
}

// Simple in‑memory cache
let cache: { [dialect in DBDialect]?: SchemaInfo } = {};
let cacheTimestamp: { [dialect in DBDialect]?: number } = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class SchemaIntrospectionService {
  static async getSchema(dialect: DBDialect): Promise<SchemaInfo> {
    const now = Date.now();
    if (cache[dialect] && cacheTimestamp[dialect] && now - cacheTimestamp[dialect]! < CACHE_TTL_MS) {
      return cache[dialect]!;
    }
    const schema = await this.fetchSchema(dialect);
    cache[dialect] = schema;
    cacheTimestamp[dialect] = now;
    return schema;
  }

  static refreshCache(): void {
    cache = {};
    cacheTimestamp = {};
  }

  private static async fetchSchema(dialect: DBDialect): Promise<SchemaInfo> {
    const conn = getReaderConnection(dialect);
    if (dialect === 'mysql') {
      return this.fetchMySQLSchema(conn);
    } else {
      return this.fetchPostgresSchema(conn);
    }
  }

  private static async fetchMySQLSchema(conn: any): Promise<SchemaInfo> {
    // tables
    const [tablesRows] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [process.env.MYSQL_DATABASE]
    );
    const tables: TableInfo[] = [];
    for (const tr of tablesRows as any[]) {
      const tableName = tr['TABLE_NAME'];
      // columns
      const [colsRows] = await conn.query(
        `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [process.env.MYSQL_DATABASE, tableName]
      );
      const columns: ColumnInfo[] = (colsRows as any[]).map((c) => ({
        name: c['COLUMN_NAME'],
        type: c['COLUMN_TYPE'],
        nullable: c['IS_NULLABLE'] === 'YES',
      }));
      // primary keys
      const [pkRows] = await conn.query(
        `SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'`,
        [process.env.MYSQL_DATABASE, tableName]
      );
      const primaryKeys = (pkRows as any[]).map((r) => r['COLUMN_NAME']);
      // foreign keys
      const [fkRows] = await conn.query(
        `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [process.env.MYSQL_DATABASE, tableName]
      );
      const foreignKeys = (fkRows as any[]).map((r) => ({
        column: r['COLUMN_NAME'],
        referencedTable: r['REFERENCED_TABLE_NAME'],
        referencedColumn: r['REFERENCED_COLUMN_NAME'],
      }));
      tables.push({ name: tableName, columns, primaryKeys, foreignKeys });
    }
    return { tables };
  }

  private static async fetchPostgresSchema(conn: any): Promise<SchemaInfo> {
    const schemaName = 'public';
    // tables
    const tablesRes = await conn.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
      [schemaName]
    );
    const tables: TableInfo[] = [];
    for (const row of tablesRes.rows) {
      const tableName = row['table_name'];
      // columns
      const colsRes = await conn.query(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
        [schemaName, tableName]
      );
      const columns: ColumnInfo[] = colsRes.rows.map((c: any) => ({
        name: c['column_name'],
        type: c['data_type'],
        nullable: c['is_nullable'] === 'YES',
      }));
      // primary keys
      const pkRes = await conn.query(
        `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema = $1
           AND tc.table_name = $2`,
        [schemaName, tableName]
      );
      const primaryKeys = pkRes.rows.map((r: any) => r['column_name']);
      // foreign keys
      const fkRes = await conn.query(
        `SELECT
           kcu.column_name,
           ccu.table_name AS referenced_table,
           ccu.column_name AS referenced_column
         FROM information_schema.key_column_usage kcu
         JOIN information_schema.constraint_column_usage ccu
           ON kcu.constraint_name = ccu.constraint_name
         WHERE kcu.table_schema = $1 AND kcu.table_name = $2 AND ccu.table_name IS NOT NULL`,
        [schemaName, tableName]
      );
      const foreignKeys = fkRes.rows.map((r: any) => ({
        column: r['column_name'],
        referencedTable: r['referenced_table'],
        referencedColumn: r['referenced_column'],
      }));
      tables.push({ name: tableName, columns, primaryKeys, foreignKeys });
    }
    return { tables };
  }
}
