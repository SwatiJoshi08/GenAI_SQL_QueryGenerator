import { getHistoryWriterConnection, getHistoryReaderConnection } from '../../db';
import { QueryResult } from 'pg';

export interface HistoryRecord {
  id?: number;
  user_id: number;
  prompt: string;
  database_type: string;
  generated_query: any; // JSONB
  selected_query?: string;
  explanation?: string;
  tables_used?: any;
  columns_used?: any;
  impact_estimate?: any;
  execution_status: string;
  execution_time_ms?: number;
  error_message?: string;
  created_at?: string;
}

/**
 * Save a generated query request.
 * Returns the inserted row id.
 */
export async function saveGeneratedHistory(record: Omit<HistoryRecord, 'id' | 'execution_status'>): Promise<number> {
  const writer = getHistoryWriterConnection();
  const sql = `
    INSERT INTO query_history (user_id, prompt, database_type, generated_query, execution_status)
    VALUES ($1, $2, $3, $4::jsonb, $5)
    RETURNING id;
  `;
  const values = [record.user_id, record.prompt, record.database_type, JSON.stringify(record.generated_query), 'generated'];
  const result: QueryResult = await writer.query(sql, values);
  return result.rows[0].id as number;
}

/**
 * Update execution info for a history row.
 * If historyId is provided, updates that row; otherwise inserts a new row.
 */
export async function upsertExecutionHistory(params: {
  historyId?: number;
  user_id: number;
  prompt: string;
  database_type: string;
  generated_query?: any;
  selected_query: string;
  execution_status: 'success' | 'failed';
  execution_time_ms: number;
  error_message?: string;
}): Promise<number> {
  const writer = getHistoryWriterConnection();
  if (params.historyId) {
    const sql = `
      UPDATE query_history
      SET selected_query = $1,
          execution_status = $2,
          execution_time_ms = $3,
          error_message = $4
      WHERE id = $5
      RETURNING id;
    `;
    const values = [params.selected_query, params.execution_status, params.execution_time_ms, params.error_message || null, params.historyId];
    const result: QueryResult = await writer.query(sql, values);
    return result.rows[0].id as number;
  } else {
    const sql = `
      INSERT INTO query_history (user_id, prompt, database_type, generated_query, selected_query, execution_status, execution_time_ms, error_message)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
      RETURNING id;
    `;
    const values = [
      params.user_id,
      params.prompt,
      params.database_type,
      params.generated_query ? JSON.stringify(params.generated_query) : null,
      params.selected_query,
      params.execution_status,
      params.execution_time_ms,
      params.error_message || null,
    ];
    const result: QueryResult = await writer.query(sql, values);
    return result.rows[0].id as number;
  }
}

/**
 * Get paginated history entries.
 */
export async function getHistory(params: {
  limit?: number;
  offset?: number;
  execution_status?: string;
  database_type?: string;
}): Promise<HistoryRecord[]> {
  const reader = getHistoryReaderConnection();
  const filters: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (params.execution_status) {
    filters.push(`execution_status = $${idx++}`);
    values.push(params.execution_status);
  }
  if (params.database_type) {
    filters.push(`database_type = $${idx++}`);
    values.push(params.database_type);
  }
  const whereClause = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  const sql = `
    SELECT * FROM query_history
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  values.push(limit, offset);
  const result: QueryResult = await reader.query(sql, values);
  return result.rows as HistoryRecord[];
}

/**
 * Get a single history record by id.
 */
export async function getHistoryById(id: number): Promise<HistoryRecord | null> {
  const reader = getHistoryReaderConnection();
  const sql = `SELECT * FROM query_history WHERE id = $1`;
  const result: QueryResult = await reader.query(sql, [id]);
  return result.rows[0] || null;
}
