import { validateSQL, Dialect, ValidationResult } from '../validator/validationService';
import { analyzeImpact } from '../impact/impactService';
import { getReaderConnection, getWriterConnection } from '../../db';
import { Pool as MySQLPool } from 'mysql2/promise';
import { Pool as PgPool } from 'pg';

export interface ExecuteRequest {
  sql: string;
  dialect: Dialect;
  confirmed?: boolean;
}

export interface ExecuteResponse {
  success: boolean;
  rows?: any[];
  columns?: any[];
  rowCount?: number;
  affectedRows?: number;
  executionTimeMs: number;
  error?: string;
}

class ExecutionError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function executeQuery(req: ExecuteRequest): Promise<ExecuteResponse> {
  const start = Date.now();
  const { sql, dialect, confirmed } = req;

  // 1. Validation
  const validation = await validateSQL(sql, dialect);
  if (validation.riskLevel === 'blocked' || !validation.valid) {
    throw new ExecutionError(`Execution blocked: ${validation.errors.join(', ')}`, 403);
  }

  // 2. Impact analysis
  const impact = await analyzeImpact(sql, dialect);
  if (impact.riskLevel === 'high' && confirmed !== true) {
    throw new ExecutionError('High risk query requires confirmation.', 403);
  }

  const operation = validation.operation || 'UNKNOWN';

  try {
    if (operation === 'SELECT') {
      // run on READER with row cap 500 and timeout 5s
      const reader = getReaderConnection(dialect);
      let querySql = sql;

      // Add a simple row cap by wrapping.
      // Trim trailing semicolon and whitespace before wrapping.
      if (dialect === 'mysql' || dialect === 'postgres') {
         const cleanedSql = sql.replace(/;+\s*$/,'').trim();
         querySql = `SELECT * FROM (${cleanedSql}) AS _capped_query LIMIT 500`;
      }

      // We'll simulate a 5-second timeout by using Promise.race with a timeout error,
      // or using driver specific timeout if available.
      let resultRows: any[] = [];
      let resultCols: any[] = [];

      if (dialect === 'mysql') {
        const pool = reader.getRawPool() as MySQLPool;
        // mysql2 allows query with timeout
        const [rows, fields] = await pool.query({
          sql: querySql,
          timeout: 5000,
        });
        resultRows = rows as any[];
        resultCols = fields ? fields.map(f => f.name) : [];
      } else {
        const pool = reader.getRawPool() as PgPool;
        // Postgres: pg pool query with query_timeout
        // Set a statement timeout of 5 seconds (PostgreSQL) using query config is not directly supported in pg typings.
        // We'll set the timeout via a SET command before executing the query.
        await pool.query('SET statement_timeout = 5000');
        const res = await pool.query(querySql);
        resultRows = res.rows;
        resultCols = res.fields ? res.fields.map(f => f.name) : [];
      }

      return {
        success: true,
        rows: resultRows,
        columns: resultCols,
        rowCount: resultRows.length,
        executionTimeMs: Date.now() - start,
      };
    }

    if (['INSERT', 'UPDATE', 'DELETE'].includes(operation)) {
      const writer = getWriterConnection(dialect);
      const estimate = impact.estimatedRows || 0;
      let actualAffected = 0;

      if (dialect === 'mysql') {
        const pool = writer.getRawPool() as MySQLPool;
        const conn = await pool.getConnection();
        await conn.beginTransaction();
        try {
          const [res]: any = await conn.query(sql);
          actualAffected = res.affectedRows;
          
          if (actualAffected > estimate * 2 && operation !== 'INSERT') {
            await conn.rollback();
            throw new ExecutionError(`Mismatch in estimated impact. Estimated: ${estimate}, Actual: ${actualAffected}. Transaction rolled back.`, 400);
          }
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        } finally {
          conn.release();
        }
      } else {
        const pool = writer.getRawPool() as PgPool;
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const res = await client.query(sql);
          actualAffected = res.rowCount ?? 0;
          
          if (actualAffected > estimate * 2 && operation !== 'INSERT') {
            await client.query('ROLLBACK');
            throw new ExecutionError(`Mismatch in estimated impact. Estimated: ${estimate}, Actual: ${actualAffected}. Transaction rolled back.`, 400);
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }

      return {
        success: true,
        affectedRows: actualAffected,
        executionTimeMs: Date.now() - start,
      };
    }

    throw new ExecutionError(`Unsupported operation: ${operation}`, 400);

  } catch (err: any) {
    if (err instanceof ExecutionError) {
      throw err;
    }
    throw new ExecutionError(err.message, 500);
  }
}
