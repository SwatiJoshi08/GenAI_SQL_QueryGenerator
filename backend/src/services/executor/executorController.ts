import { Request, Response } from 'express';
import { executeQuery, ExecuteRequest } from './executorService';
import { upsertExecutionHistory } from '../../services/history/historyService';

/**
 * Controller for executing a selected SQL query.
 * Expects body: { sql, dialect, confirmed, historyId?, prompt? }
 */
export async function execute(req: Request, res: Response) {
  try {
    const { sql, dialect, confirmed, historyId, prompt } = req.body as ExecuteRequest & {
      historyId?: number;
      prompt?: string;
    };

    if (!sql || !dialect) {
      return res.status(400).json({ error: 'Missing sql or dialect parameters.' });
    }

    const result = await executeQuery({ sql, dialect, confirmed });

    // Upsert execution history (if historyId provided, link; otherwise create new entry)
    await upsertExecutionHistory({
      historyId,
      user_id: 1,
      prompt: prompt || '',
      database_type: dialect,
      generated_query: undefined,
      selected_query: sql,
      execution_status: result.success ? 'success' : 'failed',
      execution_time_ms: result.executionTimeMs ?? 0,
      error_message: result.error,
    });

    return res.json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message });
  }
}
